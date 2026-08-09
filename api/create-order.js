import crypto from "node:crypto";
import Razorpay from "razorpay";
import {
  CheckoutError,
  attachCashfreeSession,
  cleanText,
  createPendingCheckout,
  isCashfreeMigrationMissing,
  prepareCheckout,
  requiredEnv
} from "../server/checkout-store.js";
import { buildCashfreeOrderId, createCashfreeOrder, getCashfreeConfig } from "../server/cashfree.js";

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
    throw new CheckoutError(413, "Checkout request is too large");
  }
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new CheckoutError(413, "Checkout request is too large");
    }
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new CheckoutError(400, "Checkout request is not valid JSON");
  }
}

function getPaymentProvider() {
  const provider = cleanText(process.env.PAYMENT_PROVIDER || "razorpay", 30).toLowerCase();
  if (!new Set(["cashfree", "razorpay"]).has(provider)) {
    throw new Error("PAYMENT_PROVIDER must be cashfree or razorpay");
  }
  return provider;
}

function normalizeCheckoutAttemptId(value) {
  const attemptId = cleanText(value, 80);
  if (attemptId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)) {
    return attemptId.toLowerCase();
  }
  return crypto.randomUUID();
}

function getPublicSiteUrl(request) {
  const configured = cleanText(process.env.PUBLIC_SITE_URL, 240).replace(/\/$/, "");
  if (configured) {
    const url = new URL(configured);
    const isLocalDevelopment = url.protocol === "http:" && url.hostname === "localhost";
    if (url.protocol !== "https:" && !isLocalDevelopment) {
      throw new Error("PUBLIC_SITE_URL must use HTTPS");
    }
    return url.origin;
  }
  const host = cleanText(request.headers["x-forwarded-host"] || request.headers.host, 200).split(",")[0];
  if (/^(www\.)?decorbeats\.(com|in)$/i.test(host)) {
    return `https://${host}`;
  }
  return "https://www.decorbeats.com";
}

function buildCustomerId(phone) {
  return `db_${crypto.createHash("sha256").update(phone).digest("hex").slice(0, 24)}`;
}

async function createCashfreeCheckout({ request, body, checkout }) {
  const checkoutAttemptId = normalizeCheckoutAttemptId(body.checkoutAttemptId);
  const providerOrderId = buildCashfreeOrderId(checkoutAttemptId);
  const localOrder = await createPendingCheckout({
    checkoutAttemptId,
    provider: "cashfree",
    providerOrderId,
    checkout
  });
  const siteUrl = getPublicSiteUrl(request);
  const cashfreeConfig = getCashfreeConfig();
  const order = await createCashfreeOrder(
    {
      order_id: providerOrderId,
      order_amount: checkout.totalAmount,
      order_currency: checkout.currency,
      customer_details: {
        customer_id: buildCustomerId(checkout.customer.customer_phone),
        customer_name: checkout.customer.customer_name,
        customer_phone: checkout.customer.customer_phone,
        ...(checkout.customer.customer_email ? { customer_email: checkout.customer.customer_email } : {})
      },
      order_meta: {
        return_url: `${siteUrl}/?payment_provider=cashfree&cashfree_order_id={order_id}`,
        notify_url: `${siteUrl}/api/cashfree-webhook`
      },
      order_note: "Decorbeats online checkout",
      order_tags: {
        local_order_id: String(localOrder.customer_order_id),
        item_count: String(checkout.items.length)
      }
    },
    checkoutAttemptId
  );

  if (!order?.payment_session_id || !order?.order_id) {
    throw new CheckoutError(502, "Cashfree did not return a payment session. Please try again.");
  }
  await attachCashfreeSession({
    providerOrderId,
    cfOrderId: order.cf_order_id,
    paymentSessionId: order.payment_session_id
  });

  return {
    provider: "cashfree",
    orderId: order.order_id,
    paymentSessionId: order.payment_session_id,
    amount: Number(order.order_amount),
    currency: order.order_currency || checkout.currency,
    environment: cashfreeConfig.environment,
    orderReference: localOrder.order_reference,
    items: checkout.items.map((item) => ({
      id: item.product_id,
      sku: item.product_sku,
      name: item.product_name,
      price: item.unit_price,
      quantity: item.quantity,
      line_total: item.line_total
    }))
  };
}

async function createRazorpayCheckout(checkout) {
  const keyId = requiredEnv("RAZORPAY_KEY_ID");
  const keySecret = requiredEnv("RAZORPAY_KEY_SECRET");
  const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const receipt = `db_cart_${Date.now().toString().slice(-10)}`;
  const order = await client.orders.create({
    amount: Math.round(checkout.totalAmount * 100),
    currency: checkout.currency,
    receipt,
    notes: {
      item_count: String(checkout.items.length),
      customer_name: checkout.customer.customer_name,
      customer_phone: checkout.customer.customer_phone
    }
  });
  return {
    provider: "razorpay",
    order_id: order.id,
    id: order.id,
    keyId,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    items: checkout.items.map((item) => ({
      id: item.product_id,
      sku: item.product_sku,
      name: item.product_name,
      price: item.unit_price,
      quantity: item.quantity,
      line_total: item.line_total
    }))
  };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const checkout = await prepareCheckout(body);
    const provider = getPaymentProvider();
    const order =
      provider === "cashfree"
        ? await createCashfreeCheckout({ request, body, checkout })
        : await createRazorpayCheckout(checkout);
    sendJson(response, 200, order);
  } catch (error) {
    console.error("Payment order error:", error);
    const migrationMissing = isCashfreeMigrationMissing(error);
    const statusCode =
      Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : error?.error?.code === "BAD_REQUEST_ERROR"
          ? 400
          : 500;
    sendJson(response, statusCode, {
      error: migrationMissing
        ? "Cashfree checkout is awaiting its database migration. Please use WhatsApp ordering for now."
        : error?.error?.description || error.message || "Could not start payment"
    });
  }
}
