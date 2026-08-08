import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { describe, it } from "node:test";
import handler, {
  RequestError,
  buildInquiryItemRows,
  deterministicInquiryId,
  existingInquiryMatches,
  normalizeInquiryRequest
} from "../api/admin-record-inquiry.js";

function validBody(overrides = {}) {
  const { inquiry_payload: inquiryPayloadOverrides = {}, inquiry_items_payload: itemOverrides, ...bodyOverrides } =
    overrides;
  return {
    client_inquiry_id: "inquiry_20260808_0001",
    inquiry_payload: {
      entry_date: "2026-08-08",
      customer_name: "Megha's customer",
      source: "whatsapp",
      status: "new",
      ...inquiryPayloadOverrides
    },
    inquiry_items_payload:
      itemOverrides ??
      [
        {
          product_name: "Custom brass bell from vendor",
          quantity_requested: 32,
          quoted_price: 2600
        }
      ],
    ...bodyOverrides
  };
}

describe("admin inquiry recorder", () => {
  it("builds a stable UUID-shaped inquiry ID", () => {
    const first = deterministicInquiryId("inquiry_20260808_0001");
    const retry = deterministicInquiryId("inquiry_20260808_0001");
    const other = deterministicInquiryId("inquiry_20260808_0002");

    assert.equal(first, retry);
    assert.notEqual(first, other);
    assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("accepts free-text products and keeps business date separate from audit time", () => {
    const normalized = normalizeInquiryRequest(validBody());

    assert.equal(normalized.parentPayload.entry_date, "2026-08-08");
    assert.equal(Object.hasOwn(normalized.parentPayload, "created_at"), false);
    assert.equal(normalized.items[0].product_sku, null);
    assert.equal(normalized.items[0].product_name, "Custom brass bell from vendor");
    assert.equal(normalized.items[0].quantity_requested, 32);
    assert.equal(normalized.items[0].quoted_price, 2600);
  });

  it("allows a notes-only requirement but still requires a customer", () => {
    const normalized = normalizeInquiryRequest(
      validBody({
        inquiry_payload: { customer_name: "Priya", notes: "Needs gifting options for 80 guests" },
        inquiry_items_payload: []
      })
    );
    assert.equal(normalized.items.length, 0);
    assert.equal(normalized.parentPayload.notes, "Needs gifting options for 80 guests");

    assert.throws(
      () =>
        normalizeInquiryRequest(
          validBody({ inquiry_payload: { customer_name: "", customer_phone: "" } })
        ),
      (error) => error instanceof RequestError && error.statusCode === 400
    );
  });

  it("rejects invalid dates, statuses, quantities, and currency precision", () => {
    assert.throws(
      () => normalizeInquiryRequest(validBody({ inquiry_payload: { entry_date: "2026-02-30" } })),
      /valid calendar date/
    );
    assert.throws(
      () => normalizeInquiryRequest(validBody({ inquiry_payload: { status: "delivered" } })),
      /status is invalid/
    );
    assert.throws(
      () =>
        normalizeInquiryRequest(
          validBody({ inquiry_items_payload: [{ product_name: "Bell", quantity_requested: 1.5 }] })
        ),
      /positive whole number/
    );
    assert.throws(
      () =>
        normalizeInquiryRequest(
          validBody({ inquiry_items_payload: [{ product_name: "Bell", quoted_price: 10.123 }] })
        ),
      /up to 2 decimals/
    );
  });

  it("recognizes exact retries and rejects changed content", () => {
    const { parentPayload, items } = normalizeInquiryRequest(validBody());
    const expectedRows = buildInquiryItemRows(parentPayload.id, items);
    const saved = {
      ...parentPayload,
      created_at: "2026-08-08T14:30:00",
      budget_per_unit: null,
      total_budget: null,
      inquiry_items: expectedRows.map((item) => ({
        ...item,
        quoted_price: String(item.quoted_price)
      }))
    };

    assert.equal(existingInquiryMatches(saved, parentPayload, expectedRows), true);
    assert.equal(
      existingInquiryMatches(
        { ...saved, inquiry_items: [{ ...saved.inquiry_items[0], product_name: "A different product" }] },
        parentPayload,
        expectedRows
      ),
      false
    );
  });

  it("repairs a retry whose parent and only some items were already saved", async () => {
    const requestBody = validBody({
      inquiry_items_payload: [
        { product_name: "Bell", quantity_requested: 2, quoted_price: 500 },
        { product_name: "Vendor-direct gift box", quantity_requested: 1, quoted_price: 1200 }
      ]
    });
    const { parentPayload, items } = normalizeInquiryRequest(requestBody);
    const expectedRows = buildInquiryItemRows(parentPayload.id, items);
    const databaseState = {
      ...parentPayload,
      created_at: "2026-08-08T15:00:00",
      inquiry_items: [expectedRows[0]]
    };
    const originalFetch = globalThis.fetch;
    const previousEnv = {
      ADMIN_EMAILS: process.env.ADMIN_EMAILS,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    process.env.ADMIN_EMAILS = "admin@decorbeats.test";
    process.env.SUPABASE_URL = "https://database.decorbeats.test";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

    globalThis.fetch = async (input, options = {}) => {
      const url = new URL(input);
      if (url.pathname === "/auth/v1/user") {
        assert.equal(options.headers.apikey, "test-anon-key");
        assert.equal(options.headers.Authorization, "Bearer test-user-token");
        return new Response(JSON.stringify({ email: "admin@decorbeats.test" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      assert.equal(options.headers.apikey, "test-service-key");
      assert.equal(options.headers.Authorization, "Bearer test-service-key");
      if (url.pathname === "/rest/v1/inquiries") {
        return new Response(JSON.stringify([databaseState]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/rest/v1/inquiry_items" && options.method === "POST") {
        const rows = JSON.parse(options.body);
        assert.deepEqual(rows, [expectedRows[1]]);
        databaseState.inquiry_items.push(...rows);
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected test request: ${url}`);
    };

    const request = Readable.from([Buffer.from(JSON.stringify(requestBody))]);
    request.method = "POST";
    request.headers = {
      authorization: "Bearer test-user-token",
      "content-length": String(Buffer.byteLength(JSON.stringify(requestBody)))
    };
    let responseBody = "";
    const response = {
      setHeader() {},
      end(value) {
        responseBody = value;
      }
    };

    try {
      await handler(request, response);
      const payload = JSON.parse(responseBody);
      assert.equal(response.statusCode, 200);
      assert.equal(payload.idempotent, true);
      assert.equal(payload.inquiry.inquiry_items.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
      for (const [name, value] of Object.entries(previousEnv)) {
        if (value == null) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }
    }
  });

  it("rejects non-POST requests without touching authentication or the database", async () => {
    const headers = new Map();
    let body = "";
    const response = {
      setHeader(name, value) {
        headers.set(name, value);
      },
      end(value) {
        body = value;
      }
    };

    await handler({ method: "GET", headers: {} }, response);

    assert.equal(response.statusCode, 405);
    assert.equal(headers.get("Allow"), "POST");
    assert.deepEqual(JSON.parse(body), { error: "Method not allowed" });
  });
});
