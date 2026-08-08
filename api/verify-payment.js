import crypto from "node:crypto";
import { isCashfreeMigrationMissing } from "../server/checkout-store.js";
import { reconcileCashfreeOrder } from "../server/cashfree.js";

const MAX_BODY_BYTES = 100 * 1024;

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const declaredLength = Number(request.headers["content-length"] || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    const error = new Error("Payment verification request is too large");
    error.statusCode = 413;
    throw error;
  }
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      const error = new Error("Payment verification request is too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Payment verification request is not valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function requiredEnv(...names) {
  const value = names.map((name) => process.env[name]).find(Boolean);
  if (!value) {
    throw new Error(`${names[0]} is not configured`);
  }
  return value;
}

function cleanText(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function getActivePaymentProvider() {
  const provider = cleanText(process.env.PAYMENT_PROVIDER || "razorpay", 30).toLowerCase();
  if (!new Set(["cashfree", "razorpay"]).has(provider)) {
    throw new Error("PAYMENT_PROVIDER must be cashfree or razorpay");
  }
  return provider;
}

function getSupabaseConfig() {
  return {
    url: requiredEnv("SUPABASE_URL", "VITE_SUPABASE_URL"),
    serviceKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  };
}

async function supabaseRequest(path, options = {}) {
  const { url, serviceKey } = getSupabaseConfig();
  const result = await fetch(new URL(path, url), {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!result.ok) {
    const payload = await result.json().catch(() => null);
    throw new Error(payload?.message || payload?.error || `Supabase request failed (${result.status})`);
  }

  if (result.status === 204) {
    return null;
  }
  return result.json();
}

async function fetchRazorpayPayment(paymentId) {
  const keyId = requiredEnv("RAZORPAY_KEY_ID");
  const keySecret = requiredEnv("RAZORPAY_KEY_SECRET");
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.description || "Could not confirm the Razorpay payment");
  }
  return payload;
}

async function fetchProducts(items) {
  const ids = [...new Set(items.map((item) => cleanText(item.productId, 80)).filter(Boolean))];
  if (!ids.length || ids.some((id) => !/^[a-zA-Z0-9-]{1,80}$/.test(id))) {
    throw new Error("Order items are missing");
  }
  const query = new URLSearchParams({
    id: `in.(${ids.join(",")})`,
    select: "id,sku,name,mrp,quantity,archived_at,image_url"
  });
  return supabaseRequest(`/rest/v1/products?${query.toString()}`);
}

async function findExistingOrder(paymentId) {
  const query = new URLSearchParams({
    razorpay_payment_id: `eq.${paymentId}`,
    select: "id,razorpay_payment_id",
    limit: "1"
  });
  const orders = await supabaseRequest(`/rest/v1/customer_orders?${query.toString()}`);
  return orders?.[0] ?? null;
}

async function persistVerifiedOrder({ body, payment, orderId, paymentId }) {
  const existingOrder = await findExistingOrder(paymentId);
  if (existingOrder) {
    return { orderId: existingOrder.id, stockReview: false, idempotent: true };
  }

  const requestedItems = Array.isArray(body.items) ? body.items : [];
  const products = await fetchProducts(requestedItems);
  const productById = new Map(products.map((product) => [String(product.id), product]));

  const orderItems = requestedItems.map((item) => {
    const product = productById.get(cleanText(item.productId, 80));
    const quantity = Math.max(1, Math.min(Number(item.quantity || 1) || 1, 25));
    const unitPrice = Number(product?.mrp);
    if (!product || product.archived_at || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error("A paid product could not be matched to the live catalogue");
    }
    return {
      product,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity
    };
  });

  const expectedAmount = Math.round(orderItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100);
  if (Number(payment.amount) !== expectedAmount || payment.order_id !== orderId) {
    throw new Error("The verified payment does not match the live order total");
  }

  const customer = body.customer && typeof body.customer === "object" ? body.customer : {};
  const requiredCustomerFields = [
    cleanText(customer.customerName, 120),
    cleanText(customer.phone, 30),
    cleanText(customer.addressLine1, 240),
    cleanText(customer.city, 100),
    cleanText(customer.state, 100),
    cleanText(customer.pincode, 12)
  ];
  if (requiredCustomerFields.some((value) => !value)) {
    throw new Error("Delivery details are incomplete");
  }

  const stockReview = orderItems.some((item) => Number(item.product.quantity || 0) < item.quantity);
  const orderPayload = {
    customer_name: requiredCustomerFields[0],
    customer_phone: requiredCustomerFields[1],
    customer_email: cleanText(customer.email, 160) || null,
    address_line1: requiredCustomerFields[2],
    address_line2: cleanText(customer.addressLine2, 240) || null,
    city: requiredCustomerFields[3],
    state: requiredCustomerFields[4],
    pincode: requiredCustomerFields[5],
    delivery_notes: cleanText(customer.notes, 500) || null,
    total_amount: Number(payment.amount) / 100,
    currency: payment.currency || "INR",
    payment_status: payment.status === "captured" ? "paid" : "authorized",
    order_status: stockReview ? "stock_review" : "new",
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId
  };

  const savedOrders = await supabaseRequest("/rest/v1/customer_orders", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(orderPayload)
  });
  const savedOrder = savedOrders?.[0];
  if (!savedOrder?.id) {
    throw new Error("The paid order could not be assigned an order number");
  }

  await supabaseRequest("/rest/v1/customer_order_items", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(
      orderItems.map((item) => ({
        order_id: savedOrder.id,
        product_id: String(item.product.id),
        product_sku: item.product.sku,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
        image_url: item.product.image_url || null
      }))
    )
  });

  if (!stockReview) {
    for (const item of orderItems) {
      const currentQuantity = Number(item.product.quantity || 0);
      const query = new URLSearchParams({
        id: `eq.${item.product.id}`,
        quantity: `eq.${currentQuantity}`,
        select: "id"
      });
      const updated = await supabaseRequest(`/rest/v1/products?${query.toString()}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ quantity: currentQuantity - item.quantity })
      });
      if (!updated?.length) {
        await supabaseRequest(`/rest/v1/customer_orders?id=eq.${savedOrder.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ order_status: "stock_review" })
        });
        return { orderId: savedOrder.id, stockReview: true, idempotent: false };
      }
    }
  }

  return { orderId: savedOrder.id, stockReview, idempotent: false };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    if (cleanText(body.provider).toLowerCase() === "cashfree" || body.cashfree_order_id) {
      const result = await reconcileCashfreeOrder(body.cashfree_order_id || body.orderId);
      sendJson(response, result.verified ? 200 : 202, result);
      return;
    }

    if (getActivePaymentProvider() !== "razorpay") {
      sendJson(response, 410, { error: "This payment method is no longer active. Contact Decorbeats with your payment reference." });
      return;
    }

    const keySecret = requiredEnv("RAZORPAY_KEY_SECRET");
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body;

    if (!orderId || !paymentId || !signature) {
      sendJson(response, 400, { error: "Payment verification details are missing" });
      return;
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const actualBuffer = Buffer.from(String(signature), "hex");
    const signaturesMatch =
      expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);

    if (!signaturesMatch) {
      sendJson(response, 400, { error: "Payment verification failed" });
      return;
    }

    const payment = await fetchRazorpayPayment(paymentId);
    if (payment.status !== "captured") {
      sendJson(response, 409, { error: "Payment is not complete yet" });
      return;
    }

    const persistence = await persistVerifiedOrder({ body, payment, orderId, paymentId });
    if (!persistence?.orderId) {
      throw new Error("Payment was captured, but the order could not be recorded");
    }

    sendJson(response, 200, {
      verified: true,
      orderId,
      paymentId,
      customerOrderId: persistence.orderId,
      orderReference: `DB-${String(persistence.orderId).slice(0, 8).toUpperCase()}`,
      recorded: true,
      stockReview: Boolean(persistence.stockReview)
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    const statusCode =
      Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(response, statusCode, {
      error: isCashfreeMigrationMissing(error)
        ? "Cashfree payment is confirmed, but order recording is awaiting its database migration. Contact Decorbeats with your payment reference."
        : error.message || "Could not verify payment"
    });
  }
}
