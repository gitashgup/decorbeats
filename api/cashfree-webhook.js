import { CheckoutError, cleanText, updateCheckoutProviderStatus } from "../server/checkout-store.js";
import {
  reconcileCashfreeOrder,
  verifyCashfreeWebhookSignature,
  verifyCashfreeWebhookVersion
} from "../server/cashfree.js";

const MAX_BODY_BYTES = 150 * 1024;

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(payload));
}

async function readRawBody(request) {
  const declaredLength = Number(request.headers["content-length"] || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    throw new CheckoutError(413, "Webhook request is too large");
  }
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new CheckoutError(413, "Webhook request is too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const rawBody = await readRawBody(request);
    verifyCashfreeWebhookVersion(request.headers["x-webhook-version"]);
    verifyCashfreeWebhookSignature({
      rawBody,
      timestamp: request.headers["x-webhook-timestamp"],
      signature: request.headers["x-webhook-signature"]
    });

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new CheckoutError(400, "Cashfree webhook payload is not valid JSON");
    }

    const eventType = cleanText(payload?.type, 80).toUpperCase();
    const orderId = cleanText(payload?.data?.order?.order_id, 45);
    const paymentStatus = cleanText(payload?.data?.payment?.payment_status, 40).toUpperCase();
    if (!orderId) {
      throw new CheckoutError(400, "Cashfree webhook order ID is missing");
    }

    if (eventType === "PAYMENT_SUCCESS_WEBHOOK" && paymentStatus === "SUCCESS") {
      const result = await reconcileCashfreeOrder(orderId);
      if (!result.verified || !result.recorded) {
        throw new CheckoutError(503, "Cashfree success is still awaiting order reconciliation");
      }
      sendJson(response, 200, { received: true, recorded: true, idempotent: Boolean(result.idempotent) });
      return;
    }

    await updateCheckoutProviderStatus(orderId, paymentStatus || eventType || "ACTIVE");
    sendJson(response, 200, { received: true, recorded: false });
  } catch (error) {
    console.error("Cashfree webhook error:", error);
    const statusCode =
      Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(response, statusCode, { error: error.message || "Could not process Cashfree webhook" });
  }
}
