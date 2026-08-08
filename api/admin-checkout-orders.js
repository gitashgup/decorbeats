const DEFAULT_ORDER_LIMIT = 100;
const MAX_ORDER_LIMIT = 200;
const MAX_ITEMS_PER_ORDER = 50;
const REQUEST_TIMEOUT_MS = 10_000;

const LEGACY_SELECT = [
  "id",
  "created_at",
  "customer_name",
  "customer_phone",
  "customer_email",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "pincode",
  "delivery_notes",
  "total_amount",
  "currency",
  "payment_status",
  "order_status",
  "razorpay_order_id",
  "razorpay_payment_id",
  "customer_order_items(id,product_id,product_sku,product_name,quantity,unit_price,line_total,image_url)"
].join(",");

const CHECKOUT_SELECT = [
  LEGACY_SELECT,
  "payment_provider",
  "provider_order_id",
  "provider_payment_id",
  "provider_order_status",
  "paid_at"
].join(",");

class RequestError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

class DatabaseError extends Error {
  constructor(statusCode, message, payload = null) {
    super(message);
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

function setSecurityHeaders(response) {
  response.setHeader("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Vary", "Authorization");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  setSecurityHeaders(response);
  response.end(JSON.stringify(payload));
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

function nullableText(value, maxLength = 500) {
  return cleanText(value, maxLength) || null;
}

function getSupabaseConfig() {
  const adminEmails = requiredEnv("ADMIN_EMAILS")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!adminEmails.length) {
    throw new Error("ADMIN_EMAILS is empty");
  }

  return {
    url: requiredEnv("SUPABASE_URL", "VITE_SUPABASE_URL"),
    anonKey: requiredEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"),
    serviceKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    adminEmails
  };
}

async function authenticateAdmin(request, config) {
  const authorization = String(request.headers.authorization || "");
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!accessToken) {
    throw new RequestError(401, "Admin authentication required");
  }

  let userResponse;
  try {
    userResponse = await fetch(new URL("/auth/v1/user", config.url), {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`
      },
      signal: AbortSignal.timeout(8_000)
    });
  } catch {
    throw new RequestError(503, "Could not verify the admin session. Please try again.");
  }

  if (!userResponse.ok) {
    throw new RequestError(401, "Admin session has expired");
  }

  const user = await userResponse.json().catch(() => ({}));
  const email = cleanText(user?.email, 320).toLowerCase();
  if (!email || !config.adminEmails.includes(email)) {
    throw new RequestError(403, "This account is not allowed to view website orders");
  }
}

function getOrderLimit(request) {
  const requestUrl = new URL(request.url || "/api/admin-checkout-orders", "https://decorbeats.invalid");
  const rawLimit = requestUrl.searchParams.get("limit");
  if (rawLimit == null || rawLimit === "") {
    return DEFAULT_ORDER_LIMIT;
  }
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RequestError(400, "Order limit must be a positive whole number");
  }
  return Math.min(limit, MAX_ORDER_LIMIT);
}

async function fetchCheckoutRows(config, select, limit) {
  const query = new URLSearchParams({
    select,
    order: "created_at.desc",
    limit: String(limit),
    "customer_order_items.limit": String(MAX_ITEMS_PER_ORDER)
  });

  let result;
  try {
    result = await fetch(new URL(`/rest/v1/customer_orders?${query.toString()}`, config.url), {
      headers: {
        Accept: "application/json",
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        Prefer: "count=none"
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch {
    throw new RequestError(503, "Website orders are temporarily unavailable. Please try again.");
  }

  if (!result.ok) {
    const payload = await result.json().catch(() => null);
    throw new DatabaseError(
      result.status,
      payload?.message || payload?.error_description || payload?.error || `Database request failed (${result.status})`,
      payload
    );
  }

  const rows = await result.json().catch(() => null);
  if (!Array.isArray(rows)) {
    throw new DatabaseError(502, "The database returned an invalid order list");
  }
  return rows;
}

function isCheckoutSchemaUnavailable(error) {
  if (!(error instanceof DatabaseError) || error.statusCode !== 400) {
    return false;
  }
  const code = cleanText(error.payload?.code, 40).toUpperCase();
  const message = cleanText(error.message, 1_000).toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("payment_provider") ||
    message.includes("provider_order_id") ||
    message.includes("provider_payment_id") ||
    message.includes("provider_order_status") ||
    message.includes("paid_at")
  );
}

async function loadCheckoutRows(config, limit) {
  try {
    return await fetchCheckoutRows(config, CHECKOUT_SELECT, limit);
  } catch (error) {
    if (!isCheckoutSchemaUnavailable(error)) {
      throw error;
    }
    return fetchCheckoutRows(config, LEGACY_SELECT, limit);
  }
}

function finiteMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeItem(item) {
  return {
    id: cleanText(item?.id, 80),
    productId: nullableText(item?.product_id, 80),
    sku: nullableText(item?.product_sku, 120),
    name: cleanText(item?.product_name, 240) || "Website order item",
    quantity: Math.max(0, Number.parseInt(item?.quantity, 10) || 0),
    unitPrice: finiteMoney(item?.unit_price),
    lineTotal: finiteMoney(item?.line_total),
    imageUrl: nullableText(item?.image_url, 1_500)
  };
}

function normalizeOrder(order) {
  const id = cleanText(order?.id, 80);
  const providerOrderId =
    nullableText(order?.provider_order_id, 120) || nullableText(order?.razorpay_order_id, 120);
  const providerPaymentId =
    nullableText(order?.provider_payment_id, 120) || nullableText(order?.razorpay_payment_id, 120);
  const paymentProvider =
    nullableText(order?.payment_provider, 40) ||
    (order?.razorpay_order_id || order?.razorpay_payment_id ? "razorpay" : "online");
  const items = Array.isArray(order?.customer_order_items)
    ? order.customer_order_items.slice(0, MAX_ITEMS_PER_ORDER).map(normalizeItem)
    : [];

  return {
    id,
    reference: providerOrderId || (id ? `WEB-${id.slice(0, 8).toUpperCase()}` : "Website order"),
    createdAt: nullableText(order?.created_at, 50),
    customer: {
      name: cleanText(order?.customer_name, 240) || "Website customer",
      phone: nullableText(order?.customer_phone, 40),
      email: nullableText(order?.customer_email, 320),
      address: {
        line1: nullableText(order?.address_line1, 240),
        line2: nullableText(order?.address_line2, 240),
        city: nullableText(order?.city, 100),
        state: nullableText(order?.state, 100),
        pincode: nullableText(order?.pincode, 12)
      },
      notes: nullableText(order?.delivery_notes, 500)
    },
    totalAmount: finiteMoney(order?.total_amount),
    currency: cleanText(order?.currency, 10).toUpperCase() || "INR",
    payment: {
      provider: paymentProvider,
      status: cleanText(order?.payment_status, 40).toLowerCase() || "unknown",
      providerOrderId,
      providerPaymentId,
      providerOrderStatus: nullableText(order?.provider_order_status, 40),
      paidAt: nullableText(order?.paid_at, 50)
    },
    orderStatus: cleanText(order?.order_status, 40).toLowerCase() || "new",
    items
  };
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const config = getSupabaseConfig();
    await authenticateAdmin(request, config);
    const limit = getOrderLimit(request);
    const rows = await loadCheckoutRows(config, limit);
    sendJson(response, 200, { orders: rows.map(normalizeOrder) });
  } catch (error) {
    const statusCode = error instanceof RequestError ? error.statusCode : 500;
    if (statusCode >= 500) {
      console.error("Admin website order read failed:", error);
    }
    const message = statusCode >= 500 ? "Could not load website orders right now. Please try again." : error.message;
    sendJson(response, statusCode, { error: message });
  }
}
