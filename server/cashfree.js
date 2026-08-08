import crypto from "node:crypto";
import {
  CheckoutError,
  cleanText,
  finalizeCheckoutPayment,
  requiredEnv,
  updateCheckoutProviderStatus
} from "./checkout-store.js";

export const DEFAULT_CASHFREE_API_VERSION = "2026-01-01";

export function getCashfreeConfig() {
  const environment = cleanText(requiredEnv("CASHFREE_ENVIRONMENT"), 20).toLowerCase();
  if (!new Set(["sandbox", "production"]).has(environment)) {
    throw new Error("CASHFREE_ENVIRONMENT must be sandbox or production");
  }
  const apiVersion = cleanText(process.env.CASHFREE_API_VERSION || DEFAULT_CASHFREE_API_VERSION, 20);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(apiVersion)) {
    throw new Error("CASHFREE_API_VERSION must use YYYY-MM-DD format");
  }
  return {
    clientId: requiredEnv("CASHFREE_CLIENT_ID"),
    clientSecret: requiredEnv("CASHFREE_CLIENT_SECRET"),
    environment,
    apiVersion,
    baseUrl: environment === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg"
  };
}

export class CashfreeApiError extends CheckoutError {
  constructor(statusCode, message, payload = null) {
    super(statusCode, message, payload);
    this.cashfreeCode = payload?.code || "";
  }
}

export function buildCashfreeOrderId(checkoutAttemptId) {
  const normalized = cleanText(checkoutAttemptId, 80).replace(/[^a-zA-Z0-9]/g, "");
  if (normalized.length < 16) {
    throw new CheckoutError(400, "Checkout reference is invalid. Please refresh and try again.");
  }
  return `db_${normalized.slice(0, 32)}`;
}

export async function cashfreeRequest(path, options = {}) {
  const config = getCashfreeConfig();
  let result;
  try {
    result = await fetch(`${config.baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-version": config.apiVersion,
        "x-client-id": config.clientId,
        "x-client-secret": config.clientSecret,
        ...(options.idempotencyKey ? { "x-idempotency-key": options.idempotencyKey } : {}),
        ...(options.requestId ? { "x-request-id": options.requestId } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(12_000)
    });
  } catch {
    throw new CashfreeApiError(503, "Cashfree could not be reached. Please try again.");
  }
  const payload = await result.json().catch(() => null);
  if (!result.ok) {
    throw new CashfreeApiError(
      result.status >= 500 ? 503 : result.status,
      payload?.message || payload?.error_description || "Cashfree could not process this request",
      payload
    );
  }
  return payload;
}

export async function createCashfreeOrder(payload, idempotencyKey) {
  try {
    return await cashfreeRequest("/orders", {
      method: "POST",
      body: payload,
      idempotencyKey,
      requestId: idempotencyKey
    });
  } catch (error) {
    if (error?.statusCode === 409 || error?.cashfreeCode === "order_already_exists") {
      return fetchCashfreeOrder(payload.order_id);
    }
    throw error;
  }
}

export function fetchCashfreeOrder(orderId) {
  return cashfreeRequest(`/orders/${encodeURIComponent(orderId)}`);
}

export function fetchCashfreePayments(orderId) {
  return cashfreeRequest(`/orders/${encodeURIComponent(orderId)}/payments`);
}

export function verifyCashfreeWebhookSignature({ rawBody, timestamp, signature }) {
  const config = getCashfreeConfig();
  const numericTimestamp = Number(timestamp);
  if (!timestamp || !signature || !Number.isFinite(numericTimestamp) || numericTimestamp <= 0) {
    throw new CheckoutError(400, "Cashfree webhook security headers are missing");
  }
  const generated = crypto
    .createHmac("sha256", config.clientSecret)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");
  const expected = Buffer.from(generated, "utf8");
  const received = Buffer.from(String(signature), "utf8");
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new CheckoutError(401, "Cashfree webhook signature is invalid");
  }
  return true;
}

export async function reconcileCashfreeOrder(orderId) {
  const normalizedOrderId = cleanText(orderId, 45);
  if (!/^[a-zA-Z0-9_-]{3,45}$/.test(normalizedOrderId)) {
    throw new CheckoutError(400, "Cashfree order reference is invalid");
  }

  const order = await fetchCashfreeOrder(normalizedOrderId);
  if (cleanText(order?.order_id, 45) !== normalizedOrderId) {
    throw new CheckoutError(502, "Cashfree returned a mismatched order reference");
  }
  const orderStatus = cleanText(order?.order_status, 40).toUpperCase();
  if (orderStatus !== "PAID") {
    await updateCheckoutProviderStatus(normalizedOrderId, orderStatus || "ACTIVE");
    return {
      verified: false,
      recorded: false,
      status: orderStatus || "ACTIVE",
      orderId: normalizedOrderId
    };
  }

  const payments = await fetchCashfreePayments(normalizedOrderId);
  const successfulPayment = Array.isArray(payments)
    ? payments.find((payment) => cleanText(payment?.payment_status, 30).toUpperCase() === "SUCCESS")
    : null;
  const paymentId = cleanText(successfulPayment?.cf_payment_id, 160);
  if (!paymentId) {
    throw new CheckoutError(503, "Cashfree marked this order paid, but payment details are still syncing. Please retry shortly.");
  }
  const orderAmount = Number(order.order_amount);
  const orderCurrency = cleanText(order.order_currency, 12).toUpperCase();
  const paymentAmount = Number(successfulPayment?.payment_amount);
  const paymentCurrency = cleanText(successfulPayment?.payment_currency, 12).toUpperCase();
  if (
    !Number.isFinite(orderAmount) ||
    orderAmount < 1 ||
    orderCurrency !== "INR" ||
    (Number.isFinite(paymentAmount) && Math.abs(paymentAmount - orderAmount) > 0.001) ||
    (paymentCurrency && paymentCurrency !== orderCurrency)
  ) {
    throw new CheckoutError(502, "Cashfree payment details do not match the order");
  }

  const persistence = await finalizeCheckoutPayment({
    provider: "cashfree",
    providerOrderId: normalizedOrderId,
    providerPaymentId: paymentId,
    verifiedAmount: orderAmount,
    verifiedCurrency: orderCurrency
  });

  return {
    verified: true,
    recorded: true,
    status: "PAID",
    orderId: normalizedOrderId,
    paymentId,
    amount: orderAmount,
    currency: orderCurrency,
    customerOrderId: persistence.customer_order_id,
    orderReference: persistence.order_reference,
    stockReview: Boolean(persistence.stock_review),
    idempotent: Boolean(persistence.idempotent)
  };
}
