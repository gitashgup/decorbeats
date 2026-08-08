import { createHash } from "node:crypto";

const MAX_BODY_BYTES = 100 * 1024;
const PAYMENT_METHODS = new Set(["not_recorded", "upi", "cash", "bank_transfer", "card"]);
const PAYMENT_STATUSES = new Set(["not_recorded", "pending", "part_paid", "paid"]);

class RequestError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

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
    throw new RequestError(413, "Order request is too large");
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new RequestError(413, "Order request is too large");
    }
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "Order request is not valid JSON");
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
    adminEmails
  };
}

async function authenticateAdmin(request) {
  const authorization = String(request.headers.authorization || "");
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!accessToken) {
    throw new RequestError(401, "Admin authentication required");
  }

  const { url, anonKey, adminEmails } = getSupabaseConfig();
  let userResponse;
  try {
    userResponse = await fetch(new URL("/auth/v1/user", url), {
      headers: {
        apikey: anonKey,
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
  if (!email || !adminEmails.includes(email)) {
    throw new RequestError(403, "This account is not allowed to record orders");
  }
  return { accessToken, email };
}

async function supabaseRequest(path, accessToken, options = {}) {
  const { url, anonKey } = getSupabaseConfig();
  let result;
  try {
    result = await fetch(new URL(path, url), {
      ...options,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers
      },
      signal: AbortSignal.timeout(10_000)
    });
  } catch {
    throw new RequestError(503, "Database connection was interrupted. Tap Save order again; the same order will not be duplicated.");
  }

  if (!result.ok) {
    const payload = await result.json().catch(() => null);
    const error = new RequestError(
      result.status,
      payload?.message || payload?.error_description || payload?.error || `Database request failed (${result.status})`
    );
    error.databaseResponse = true;
    throw error;
  }
  if (result.status === 204) {
    return null;
  }
  return result.json();
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 50) {
    throw new RequestError(400, "Add between 1 and 50 order items");
  }

  return rawItems.map((item, index) => {
    const productName = cleanText(item?.product_name, 240);
    const quantity = Number(item?.quantity_sold);
    const sellingPrice = Number(item?.selling_price);
    const costPrice = item?.cost_price == null || item.cost_price === "" ? null : Number(item.cost_price);

    if (item?.track_inventory === true) {
      throw new RequestError(400, "Mixed and vendor-direct orders must be saved without changing inventory");
    }
    if (!productName) {
      throw new RequestError(400, `Item ${index + 1} needs a name`);
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 999999) {
      throw new RequestError(400, `Enter a valid quantity for ${productName}`);
    }
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      throw new RequestError(400, `Enter a valid unit price for ${productName}`);
    }
    if (costPrice != null && (!Number.isFinite(costPrice) || costPrice < 0)) {
      throw new RequestError(400, `Enter a valid cost for ${productName}`);
    }

    return { productName, quantity, sellingPrice, costPrice };
  });
}

function deterministicUuid(scope, value) {
  const hash = createHash("sha256").update(`${scope}:${value}`).digest("hex");
  const variant = ((Number.parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function deterministicSaleId(clientOrderId) {
  return deterministicUuid("decorbeats-order", clientOrderId);
}

function deterministicSaleItemId(saleId, index, item) {
  return deterministicUuid("decorbeats-order-item", `${saleId}:${index}:${itemSignature(item)}`);
}

async function findOrder(saleId, accessToken) {
  const query = new URLSearchParams({ id: `eq.${saleId}`, select: "*,sale_items(*)", limit: "1" });
  const rows = await supabaseRequest(`/rest/v1/sales?${query.toString()}`, accessToken);
  return rows?.[0] ?? null;
}

function itemSignature(item) {
  return JSON.stringify([
    cleanText(item.product_name ?? item.productName, 240).toLowerCase(),
    Number(item.quantity_sold ?? item.quantity ?? 0),
    Number(item.selling_price ?? item.sellingPrice ?? 0),
    item.cost_price == null && item.costPrice == null ? null : Number(item.cost_price ?? item.costPrice)
  ]);
}

function existingOrderMatches(existing, salePayload, items, totalAmount) {
  if (cleanText(existing.customer_name, 240) !== cleanText(salePayload.customer_name, 240)) {
    return false;
  }
  if (Number(existing.total_amount || 0) !== Number(totalAmount || 0)) {
    return false;
  }
  if (cleanText(existing.notes, 8_000) !== cleanText(salePayload.notes, 8_000)) {
    return false;
  }
  const existingItems = Array.isArray(existing.sale_items) ? existing.sale_items : [];
  if (existingItems.length !== items.length) {
    return false;
  }
  const expectedSignatures = items.map(itemSignature).sort();
  const existingSignatures = existingItems.map(itemSignature).sort();
  return expectedSignatures.every((signature, index) => signature === existingSignatures[index]);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  let createdHeader = false;
  let savedSaleId = "";
  let accessToken = "";
  try {
    ({ accessToken } = await authenticateAdmin(request));
    const body = await readJsonBody(request);
    const clientOrderId = cleanText(body.client_order_id, 100);
    if (!clientOrderId || !/^[a-zA-Z0-9_-]{8,100}$/.test(clientOrderId)) {
      throw new RequestError(400, "Order reference is missing or invalid");
    }

    const salePayload = body.sale_payload && typeof body.sale_payload === "object" ? body.sale_payload : {};
    const items = normalizeItems(body.sale_items_payload);
    const rawNotes = String(salePayload.notes ?? "").trim();
    if (rawNotes.length > 8_000) {
      throw new RequestError(400, "Order notes are too long");
    }
    const paymentMethod = cleanText(salePayload.payment_method, 40) || "not_recorded";
    const paymentStatus = cleanText(salePayload.payment_status, 40) || "not_recorded";
    if (!PAYMENT_METHODS.has(paymentMethod) || !PAYMENT_STATUSES.has(paymentStatus)) {
      throw new RequestError(400, "Payment details are invalid");
    }

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.sellingPrice, 0);
    const parentPayload = {
      id: deterministicSaleId(clientOrderId),
      customer_name: cleanText(salePayload.customer_name, 240) || null,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      notes: rawNotes || null,
      total_amount: totalAmount
    };
    savedSaleId = parentPayload.id;

    let existing = await findOrder(savedSaleId, accessToken);
    if (existing && Array.isArray(existing.sale_items) && existing.sale_items.length) {
      if (!existingOrderMatches(existing, parentPayload, items, totalAmount)) {
        throw new RequestError(409, "This order reference was already used for different details. Close and reopen the recorder.");
      }
      sendJson(response, 200, { sale: existing, idempotent: true });
      return;
    }
    if (existing && !existingOrderMatches({ ...existing, sale_items: [] }, parentPayload, [], totalAmount)) {
      throw new RequestError(409, "This order reference was already used for different details. Close and reopen the recorder.");
    }

    if (!existing) {
      try {
        const parentRows = await supabaseRequest("/rest/v1/sales", accessToken, {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(parentPayload)
        });
        if (!parentRows?.[0]?.id) {
          throw new RequestError(500, "The order could not be assigned an order number");
        }
        createdHeader = true;
      } catch (error) {
        if (error.statusCode !== 409) {
          throw error;
        }
        existing = await findOrder(savedSaleId, accessToken);
        if (!existing) {
          throw error;
        }
      }
    }

    const latestBeforeItems = existing || (await findOrder(savedSaleId, accessToken));
    const existingItems = Array.isArray(latestBeforeItems?.sale_items) ? latestBeforeItems.sale_items : [];
    if (!existingItems.length) {
      try {
        await supabaseRequest("/rest/v1/sale_items", accessToken, {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify(
            items.map((item, index) => ({
              id: deterministicSaleItemId(savedSaleId, index, item),
              sale_id: savedSaleId,
              product_sku: null,
              product_name: item.productName,
              quantity_sold: item.quantity,
              selling_price: item.sellingPrice,
              cost_price: item.costPrice
            }))
          )
        });
      } catch (error) {
        if (error.statusCode !== 409) {
          throw error;
        }
        const concurrentSave = await findOrder(savedSaleId, accessToken);
        if (!concurrentSave || !existingOrderMatches(concurrentSave, parentPayload, items, totalAmount)) {
          throw error;
        }
      }
    } else if (!existingOrderMatches(latestBeforeItems, parentPayload, items, totalAmount)) {
      throw new RequestError(409, "This order is already being saved. Refresh Orders before trying again.");
    }

    const savedSale = await findOrder(savedSaleId, accessToken);
    if (!savedSale || !existingOrderMatches(savedSale, parentPayload, items, totalAmount)) {
      throw new RequestError(503, "The order is still being saved. Tap Save order again to finish it safely.");
    }
    sendJson(response, 200, { sale: savedSale, idempotent: Boolean(existing) });
  } catch (error) {
    const statusCode = error instanceof RequestError ? error.statusCode : 500;
    if (statusCode >= 500) {
      console.error("Admin order save failed:", error);
    }
    if (createdHeader && savedSaleId && accessToken && error.databaseResponse && error.statusCode < 500) {
      const query = new URLSearchParams({ id: `eq.${savedSaleId}` });
      await supabaseRequest(`/rest/v1/sales?${query.toString()}`, accessToken, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" }
      }).catch((cleanupError) => console.error("Could not remove incomplete order:", cleanupError));
    }
    const message = statusCode >= 500 ? "Could not save this order right now. Please try again." : error.message;
    sendJson(response, statusCode, { error: message });
  }
}
