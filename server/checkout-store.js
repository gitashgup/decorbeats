const REQUEST_TIMEOUT_MS = 10_000;
const SAFE_PRODUCT_ID = /^[a-zA-Z0-9-]{1,80}$/;

export class CheckoutError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function requiredEnv(...names) {
  const value = names.map((name) => process.env[name]).find(Boolean);
  if (!value) {
    throw new Error(`${names[0]} is not configured`);
  }
  return value;
}

export function cleanText(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function roundMoney(value) {
  return Math.round((Number(value) + 1e-9) * 100) / 100;
}

export function normalizeIndianPhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
    throw new CheckoutError(400, "Enter a valid 10-digit Indian mobile number");
  }
  return digits;
}

function getSupabaseConfig() {
  return {
    url: requiredEnv("SUPABASE_URL", "VITE_SUPABASE_URL"),
    serviceKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  };
}

export async function supabaseServiceRequest(path, options = {}) {
  const { url, serviceKey } = getSupabaseConfig();
  let result;
  try {
    result = await fetch(new URL(path, url), {
      ...options,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        ...options.headers
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch {
    throw new CheckoutError(503, "The order service is temporarily unavailable. Please try again.");
  }

  if (!result.ok) {
    const payload = await result.json().catch(() => null);
    const message =
      payload?.message || payload?.error_description || payload?.error || `Database request failed (${result.status})`;
    const error = new CheckoutError(result.status >= 500 ? 503 : result.status, message, payload);
    error.databaseResponse = true;
    throw error;
  }
  if (result.status === 204) {
    return null;
  }
  return result.json();
}

async function fetchProducts(productIds) {
  const ids = [...new Set(productIds.map((id) => cleanText(id, 80)).filter(Boolean))];
  if (!ids.length) {
    throw new CheckoutError(400, "Your cart is empty");
  }
  if (ids.some((id) => !SAFE_PRODUCT_ID.test(id))) {
    throw new CheckoutError(400, "One or more cart products are invalid");
  }
  const query = new URLSearchParams({
    id: `in.(${ids.join(",")})`,
    select: "id,sku,name,mrp,quantity,archived_at,image_url"
  });
  return supabaseServiceRequest(`/rest/v1/products?${query.toString()}`);
}

export async function prepareCheckout(rawBody) {
  const requestedItems = Array.isArray(rawBody?.items) ? rawBody.items : [];
  if (!requestedItems.length || requestedItems.length > 25) {
    throw new CheckoutError(400, "Add between 1 and 25 products before checkout");
  }

  const requestedByProduct = new Map();
  requestedItems.forEach((item) => {
    const productId = cleanText(item?.productId, 80);
    const quantity = Number(item?.quantity);
    if (!SAFE_PRODUCT_ID.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 25) {
      throw new CheckoutError(400, "Each cart quantity must be between 1 and 25");
    }
    requestedByProduct.set(productId, (requestedByProduct.get(productId) || 0) + quantity);
  });

  if ([...requestedByProduct.values()].some((quantity) => quantity > 25)) {
    throw new CheckoutError(400, "A product quantity cannot exceed 25 units per checkout");
  }

  const products = await fetchProducts([...requestedByProduct.keys()]);
  const productById = new Map(products.map((product) => [String(product.id), product]));
  const items = [...requestedByProduct.entries()].map(([productId, quantity]) => {
    const product = productById.get(productId);
    if (!product || product.archived_at) {
      throw new CheckoutError(409, "One or more products are no longer available");
    }
    const availableQuantity = Math.max(0, Number(product.quantity || 0));
    if (availableQuantity < quantity) {
      throw new CheckoutError(
        409,
        availableQuantity > 0
          ? `Only ${availableQuantity} of ${product.name || "this product"} are currently available`
          : `${product.name || "A product"} is currently sold out`
      );
    }
    const unitPrice = roundMoney(product.mrp);
    if (!Number.isFinite(unitPrice) || unitPrice < 1) {
      throw new CheckoutError(400, `${product.name || "A product"} does not have an online payment price yet`);
    }
    return {
      product_id: String(product.id),
      product_sku: cleanText(product.sku, 120) || null,
      product_name: cleanText(product.name, 240),
      quantity,
      unit_price: unitPrice,
      line_total: roundMoney(unitPrice * quantity),
      image_url: cleanText(product.image_url, 1_500) || null
    };
  });

  const rawCustomer = rawBody?.customer && typeof rawBody.customer === "object" ? rawBody.customer : {};
  const customer = {
    customer_name: cleanText(rawCustomer.customerName, 120),
    customer_phone: normalizeIndianPhone(rawCustomer.phone),
    customer_email: cleanText(rawCustomer.email, 160) || null,
    address_line1: cleanText(rawCustomer.addressLine1, 240),
    address_line2: cleanText(rawCustomer.addressLine2, 240) || null,
    city: cleanText(rawCustomer.city, 100),
    state: cleanText(rawCustomer.state, 100),
    pincode: cleanText(rawCustomer.pincode, 6),
    delivery_notes: cleanText(rawCustomer.notes, 500) || null
  };

  if (!customer.customer_name || !customer.address_line1 || !customer.city || !customer.state || !/^\d{6}$/.test(customer.pincode)) {
    throw new CheckoutError(400, "Please complete the name and delivery address before payment");
  }
  if (customer.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.customer_email)) {
    throw new CheckoutError(400, "Enter a valid email address or leave it blank");
  }

  return {
    customer,
    items,
    totalAmount: roundMoney(items.reduce((sum, item) => sum + item.line_total, 0)),
    currency: "INR"
  };
}

export async function createPendingCheckout({ checkoutAttemptId, provider, providerOrderId, checkout }) {
  const rows = await supabaseServiceRequest("/rest/v1/rpc/create_customer_checkout_v2", {
    method: "POST",
    body: JSON.stringify({
      p_checkout_attempt_id: checkoutAttemptId,
      p_provider: provider,
      p_provider_order_id: providerOrderId,
      p_customer: checkout.customer,
      p_items: checkout.items,
      p_total_amount: checkout.totalAmount,
      p_currency: checkout.currency
    })
  });
  const result = Array.isArray(rows) ? rows[0] : rows;
  if (!result?.customer_order_id) {
    throw new CheckoutError(500, "The checkout could not be assigned an order number");
  }
  return result;
}

export async function attachCashfreeSession({ providerOrderId, cfOrderId, paymentSessionId }) {
  await supabaseServiceRequest(`/rest/v1/customer_orders?provider_order_id=eq.${encodeURIComponent(providerOrderId)}&payment_status=neq.paid`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      provider_checkout_id: cleanText(cfOrderId, 120) || null,
      provider_payment_session_id: cleanText(paymentSessionId, 1_500) || null,
      provider_order_status: "ACTIVE",
      payment_updated_at: new Date().toISOString()
    })
  });
}

export async function updateCheckoutProviderStatus(providerOrderId, providerStatus) {
  if (!providerOrderId) {
    return;
  }
  await supabaseServiceRequest(`/rest/v1/customer_orders?provider_order_id=eq.${encodeURIComponent(providerOrderId)}&payment_status=neq.paid`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      provider_order_status: cleanText(providerStatus, 40).toUpperCase(),
      payment_updated_at: new Date().toISOString()
    })
  });
}

export async function finalizeCheckoutPayment({
  provider,
  providerOrderId,
  providerPaymentId,
  verifiedAmount,
  verifiedCurrency
}) {
  const rows = await supabaseServiceRequest("/rest/v1/rpc/finalize_customer_checkout_payment_v2", {
    method: "POST",
    body: JSON.stringify({
      p_provider: provider,
      p_provider_order_id: providerOrderId,
      p_provider_payment_id: providerPaymentId,
      p_verified_amount: verifiedAmount,
      p_verified_currency: verifiedCurrency
    })
  });
  const result = Array.isArray(rows) ? rows[0] : rows;
  if (!result?.recorded || !result?.customer_order_id) {
    throw new CheckoutError(500, "Payment is confirmed, but the order could not be recorded. Decorbeats support has been notified.");
  }
  return result;
}

export function isCashfreeMigrationMissing(error) {
  const message = cleanText(error?.message, 1_000).toLowerCase();
  return (
    message.includes("create_customer_checkout_v2") ||
    message.includes("finalize_customer_checkout_payment_v2") ||
    message.includes("provider_order_id") ||
    message.includes("schema cache")
  );
}
