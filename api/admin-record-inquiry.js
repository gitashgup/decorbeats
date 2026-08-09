import { createHash } from "node:crypto";

const MAX_BODY_BYTES = 100 * 1024;
const MAX_ITEMS = 50;
const MAX_MONEY = 1_000_000_000;
const REQUEST_TIMEOUT_MS = 10_000;
const INQUIRY_STATUSES = new Set(["new", "contacted", "quoted", "follow_up", "converted", "lost"]);

export class RequestError extends Error {
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

async function readJsonBody(request) {
  const declaredLength = Number(request.headers["content-length"] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new RequestError(413, "Inquiry request is too large");
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new RequestError(413, "Inquiry request is too large");
    }
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "Inquiry request is not valid JSON");
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

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value, fieldName, maxLength, { required = false } = {}) {
  if (value == null) {
    if (required) {
      throw new RequestError(400, `${fieldName} is required`);
    }
    return null;
  }
  if (typeof value !== "string" && typeof value !== "number") {
    throw new RequestError(400, `${fieldName} must be text`);
  }
  const text = String(value).trim();
  if (!text) {
    if (required) {
      throw new RequestError(400, `${fieldName} is required`);
    }
    return null;
  }
  if (text.length > maxLength) {
    throw new RequestError(400, `${fieldName} is too long`);
  }
  return text;
}

function optionalMoney(value, fieldName) {
  if (value == null || (typeof value === "string" && !value.trim())) {
    return null;
  }
  if (typeof value !== "number" && typeof value !== "string") {
    throw new RequestError(400, `${fieldName} must be a valid amount`);
  }
  const amount = Number(value);
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > MAX_MONEY ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7
  ) {
    throw new RequestError(400, `${fieldName} must be a non-negative amount with up to 2 decimals`);
  }
  return amount;
}

function optionalQuantity(value, fieldName) {
  if (value == null || (typeof value === "string" && !value.trim())) {
    return null;
  }
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999_999) {
    throw new RequestError(400, `${fieldName} must be a positive whole number`);
  }
  return quantity;
}

function normalizeEntryDate(value) {
  const entryDate = boundedText(value, "Entry date", 10);
  if (!entryDate) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(entryDate);
  if (!match) {
    throw new RequestError(400, "Entry date must use YYYY-MM-DD");
  }
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    throw new RequestError(400, "Entry date is not a valid calendar date");
  }
  return entryDate;
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
    throw new RequestError(403, "This account is not allowed to record inquiries");
  }
  return { email };
}

async function databaseRequest(config, path, options = {}) {
  let result;
  try {
    result = await fetch(new URL(path, config.url), {
      ...options,
      headers: {
        Accept: "application/json",
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": "application/json",
        ...options.headers
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch {
    throw new DatabaseError(503, "Database connection was interrupted");
  }

  if (!result.ok) {
    const payload = await result.json().catch(() => null);
    throw new DatabaseError(
      result.status,
      payload?.message || payload?.error_description || payload?.error || `Database request failed (${result.status})`,
      payload
    );
  }
  if (result.status === 204) {
    return null;
  }
  const payload = await result.json().catch(() => null);
  if (payload == null) {
    throw new DatabaseError(502, "The database returned an invalid response");
  }
  return payload;
}

function normalizeItems(rawItems) {
  if (rawItems == null) {
    return [];
  }
  if (!Array.isArray(rawItems) || rawItems.length > MAX_ITEMS) {
    throw new RequestError(400, `Add no more than ${MAX_ITEMS} inquiry items`);
  }

  return rawItems.map((item, index) => {
    if (!isPlainObject(item)) {
      throw new RequestError(400, `Item ${index + 1} is invalid`);
    }
    const productName = boundedText(item.product_name, `Item ${index + 1} name`, 240, { required: true });
    return {
      product_sku: boundedText(item.product_sku, `SKU for ${productName}`, 120),
      product_name: productName,
      quantity_requested: optionalQuantity(item.quantity_requested, `Quantity for ${productName}`),
      quoted_price: optionalMoney(item.quoted_price, `Quoted price for ${productName}`)
    };
  });
}

export function normalizeInquiryRequest(body) {
  if (!isPlainObject(body)) {
    throw new RequestError(400, "Inquiry request must be an object");
  }
  const clientInquiryId = boundedText(body.client_inquiry_id, "Inquiry reference", 100, { required: true });
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(clientInquiryId)) {
    throw new RequestError(400, "Inquiry reference is missing or invalid");
  }
  if (!isPlainObject(body.inquiry_payload)) {
    throw new RequestError(400, "Inquiry details are required");
  }

  const raw = body.inquiry_payload;
  const customerName = boundedText(raw.customer_name, "Customer name", 240);
  const customerPhone = boundedText(raw.customer_phone, "Customer phone", 40);
  if (!customerName && !customerPhone) {
    throw new RequestError(400, "Add the customer name or mobile number");
  }
  if (customerPhone && !/^[0-9+()\-\s]{3,40}$/.test(customerPhone)) {
    throw new RequestError(400, "Customer phone contains invalid characters");
  }

  const source = (boundedText(raw.source, "Inquiry source", 40) || "whatsapp").toLowerCase();
  if (!/^[a-z0-9_-]{1,40}$/.test(source)) {
    throw new RequestError(400, "Inquiry source is invalid");
  }
  const status = (boundedText(raw.status, "Inquiry status", 40) || "new").toLowerCase();
  if (!INQUIRY_STATUSES.has(status)) {
    throw new RequestError(400, "Inquiry status is invalid");
  }

  const notes = boundedText(raw.notes, "Inquiry notes", 8_000);
  const items = normalizeItems(body.inquiry_items_payload);
  if (!items.length && !notes) {
    throw new RequestError(400, "Add at least one item or a short requirement note");
  }

  const entryDate = normalizeEntryDate(raw.entry_date);
  return {
    clientInquiryId,
    parentPayload: {
      id: deterministicInquiryId(clientInquiryId),
      ...(entryDate ? { entry_date: entryDate } : {}),
      customer_name: customerName,
      customer_phone: customerPhone,
      source,
      occasion: boundedText(raw.occasion, "Occasion", 240),
      required_by_date: boundedText(raw.required_by_date, "Required-by date", 80),
      budget_per_unit: optionalMoney(raw.budget_per_unit, "Budget per unit"),
      total_budget: optionalMoney(raw.total_budget, "Total budget"),
      status,
      raw_transcript: boundedText(raw.raw_transcript, "Inquiry transcript", 12_000),
      notes
    },
    items
  };
}

export function deterministicUuid(scope, value) {
  const hash = createHash("sha256").update(`${scope}:${value}`).digest("hex");
  const variant = ((Number.parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function deterministicInquiryId(clientInquiryId) {
  return deterministicUuid("decorbeats-inquiry", clientInquiryId);
}

function itemSignature(item) {
  return JSON.stringify([
    cleanText(item?.product_sku, 120).toLowerCase() || null,
    cleanText(item?.product_name, 240).toLowerCase(),
    item?.quantity_requested == null ? null : Number(item.quantity_requested),
    item?.quoted_price == null ? null : Number(item.quoted_price)
  ]);
}

function deterministicInquiryItemId(inquiryId, index, item) {
  return deterministicUuid("decorbeats-inquiry-item", `${inquiryId}:${index}:${itemSignature(item)}`);
}

export function buildInquiryItemRows(inquiryId, items) {
  return items.map((item, index) => ({
    id: deterministicInquiryItemId(inquiryId, index, item),
    inquiry_id: inquiryId,
    ...item
  }));
}

function nullableDatabaseText(value, maxLength) {
  return cleanText(value, maxLength) || null;
}

function nullableDatabaseMoney(value) {
  return value == null || value === "" ? null : Number(value);
}

export function existingParentMatches(existing, expected) {
  const textFields = [
    ["customer_name", 240],
    ["customer_phone", 40],
    ["source", 40],
    ["occasion", 240],
    ["required_by_date", 80],
    ["status", 40],
    ["raw_transcript", 12_000],
    ["notes", 8_000]
  ];
  for (const [field, maxLength] of textFields) {
    if (nullableDatabaseText(existing?.[field], maxLength) !== nullableDatabaseText(expected?.[field], maxLength)) {
      return false;
    }
  }
  if (
    nullableDatabaseMoney(existing?.budget_per_unit) !== nullableDatabaseMoney(expected?.budget_per_unit) ||
    nullableDatabaseMoney(existing?.total_budget) !== nullableDatabaseMoney(expected?.total_budget)
  ) {
    return false;
  }
  if (expected?.entry_date && cleanText(existing?.entry_date, 10) !== expected.entry_date) {
    return false;
  }
  return true;
}

function existingItemsAreExpectedSubset(existingItems, expectedRows) {
  const expectedById = new Map(expectedRows.map((item) => [item.id, item]));
  return existingItems.every((item) => {
    const expected = expectedById.get(item?.id);
    return expected && itemSignature(item) === itemSignature(expected);
  });
}

export function existingInquiryMatches(existing, parentPayload, expectedRows) {
  if (!existingParentMatches(existing, parentPayload)) {
    return false;
  }
  const existingItems = Array.isArray(existing?.inquiry_items) ? existing.inquiry_items : [];
  if (existingItems.length !== expectedRows.length || !existingItemsAreExpectedSubset(existingItems, expectedRows)) {
    return false;
  }
  const existingIds = new Set(existingItems.map((item) => item.id));
  return expectedRows.every((item) => existingIds.has(item.id));
}

async function findInquiry(config, inquiryId) {
  const query = new URLSearchParams({ id: `eq.${inquiryId}`, select: "*,inquiry_items(*)", limit: "1" });
  const rows = await databaseRequest(config, `/rest/v1/inquiries?${query.toString()}`);
  if (!Array.isArray(rows)) {
    throw new DatabaseError(502, "The database returned an invalid inquiry response");
  }
  return rows[0] ?? null;
}

function conflictError() {
  return new RequestError(
    409,
    "This inquiry reference was already used for different details. Close and reopen the recorder."
  );
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const config = getSupabaseConfig();
    await authenticateAdmin(request, config);
    const body = await readJsonBody(request);
    const { parentPayload, items } = normalizeInquiryRequest(body);
    const inquiryId = parentPayload.id;
    const expectedRows = buildInquiryItemRows(inquiryId, items);

    let existing = await findInquiry(config, inquiryId);
    let idempotent = Boolean(existing);
    if (existing && !existingParentMatches(existing, parentPayload)) {
      throw conflictError();
    }
    if (existingInquiryMatches(existing, parentPayload, expectedRows)) {
      sendJson(response, 200, { inquiry: existing, idempotent: true });
      return;
    }

    if (!existing) {
      try {
        const rows = await databaseRequest(config, "/rest/v1/inquiries", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(parentPayload)
        });
        if (!Array.isArray(rows) || !rows[0]?.id) {
          throw new DatabaseError(502, "The inquiry could not be assigned a reference");
        }
      } catch (error) {
        const recovered = await findInquiry(config, inquiryId).catch(() => null);
        if (!recovered) {
          throw error;
        }
        if (!existingParentMatches(recovered, parentPayload)) {
          throw conflictError();
        }
        existing = recovered;
        idempotent = true;
      }
    }

    let latest = existing || (await findInquiry(config, inquiryId));
    if (!latest || !existingParentMatches(latest, parentPayload)) {
      throw conflictError();
    }
    const currentItems = Array.isArray(latest.inquiry_items) ? latest.inquiry_items : [];
    if (!existingItemsAreExpectedSubset(currentItems, expectedRows)) {
      throw conflictError();
    }

    const currentIds = new Set(currentItems.map((item) => item.id));
    const missingRows = expectedRows.filter((item) => !currentIds.has(item.id));
    if (missingRows.length) {
      try {
        await databaseRequest(config, "/rest/v1/inquiry_items", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify(missingRows)
        });
      } catch (error) {
        const recovered = await findInquiry(config, inquiryId).catch(() => null);
        if (!recovered || !existingInquiryMatches(recovered, parentPayload, expectedRows)) {
          throw error;
        }
        latest = recovered;
        idempotent = true;
      }
    }

    const savedInquiry = existingInquiryMatches(latest, parentPayload, expectedRows)
      ? latest
      : await findInquiry(config, inquiryId);
    if (!savedInquiry || !existingParentMatches(savedInquiry, parentPayload)) {
      throw conflictError();
    }
    if (!existingInquiryMatches(savedInquiry, parentPayload, expectedRows)) {
      throw new RequestError(503, "The inquiry is still being saved. Tap Save inquiry again to finish it safely.");
    }

    sendJson(response, 200, { inquiry: savedInquiry, idempotent });
  } catch (error) {
    const statusCode = error instanceof RequestError ? error.statusCode : 500;
    if (statusCode >= 500) {
      console.error("Admin inquiry save failed:", error);
    }
    const message =
      statusCode >= 500
        ? "Could not save this inquiry right now. Please try again; the same inquiry will not be duplicated."
        : error.message;
    sendJson(response, statusCode, { error: message });
  }
}
