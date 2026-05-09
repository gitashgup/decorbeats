import crypto from "node:crypto";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured");
    }

    const body = await readJsonBody(request);
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body;

    if (!orderId || !paymentId || !signature) {
      sendJson(response, 400, { error: "Payment verification details are missing" });
      return;
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      sendJson(response, 400, { error: "Payment verification failed" });
      return;
    }

    sendJson(response, 200, {
      verified: true,
      orderId,
      paymentId
    });
  } catch (error) {
    console.error("Razorpay verify error:", error);
    sendJson(response, 500, { error: error.message || "Could not verify payment" });
  }
}
