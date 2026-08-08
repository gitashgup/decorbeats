import assert from "node:assert/strict";
import crypto from "node:crypto";
import { beforeEach, describe, it } from "node:test";
import { CheckoutError, normalizeIndianPhone, roundMoney } from "../server/checkout-store.js";
import { buildCashfreeOrderId, verifyCashfreeWebhookSignature } from "../server/cashfree.js";

beforeEach(() => {
  process.env.CASHFREE_CLIENT_ID = "test-client-id";
  process.env.CASHFREE_CLIENT_SECRET = "test-client-secret";
  process.env.CASHFREE_ENVIRONMENT = "sandbox";
});

describe("Cashfree checkout helpers", () => {
  it("keeps order IDs within Cashfree's accepted format", () => {
    const orderId = buildCashfreeOrderId("0190f4f4-fafd-7de2-b9d0-759962a713c1");
    assert.match(orderId, /^[a-zA-Z0-9_-]{3,45}$/);
    assert.equal(orderId, "db_0190f4f4fafd7de2b9d0759962a713c1");
  });

  it("verifies a signed raw webhook payload", () => {
    const rawBody = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK", data: { order: { order_id: "db_test" } } });
    const timestamp = String(Date.now());
    const signature = crypto
      .createHmac("sha256", process.env.CASHFREE_CLIENT_SECRET)
      .update(`${timestamp}${rawBody}`)
      .digest("base64");

    assert.equal(verifyCashfreeWebhookSignature({ rawBody, timestamp, signature }), true);
  });

  it("rejects a webhook with an invalid signature", () => {
    assert.throws(
      () =>
        verifyCashfreeWebhookSignature({
          rawBody: "{}",
          timestamp: String(Date.now()),
          signature: Buffer.from("invalid").toString("base64")
        }),
      (error) => error instanceof CheckoutError && error.statusCode === 401
    );
  });

  it("accepts a correctly signed delayed retry", () => {
    const timestamp = String(Date.now() - 24 * 60 * 60 * 1_000);
    const rawBody = "{}";
    const signature = crypto
      .createHmac("sha256", process.env.CASHFREE_CLIENT_SECRET)
      .update(`${timestamp}${rawBody}`)
      .digest("base64");
    assert.equal(verifyCashfreeWebhookSignature({ rawBody, timestamp, signature }), true);
  });

  it("normalizes Indian phone numbers and rupee precision", () => {
    assert.equal(normalizeIndianPhone("+91 98111 33661"), "9811133661");
    assert.equal(roundMoney(10.155), 10.16);
    assert.throws(() => normalizeIndianPhone("12345"), CheckoutError);
  });
});
