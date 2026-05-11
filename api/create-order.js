import Razorpay from "razorpay";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
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

async function fetchProductFromSupabase(productId) {
  const supabaseUrl = getRequiredEnv("VITE_SUPABASE_URL");
  const supabaseAnonKey = getRequiredEnv("VITE_SUPABASE_ANON_KEY");
  const productUrl = new URL("/rest/v1/products", supabaseUrl);
  productUrl.searchParams.set("id", `eq.${productId}`);
  productUrl.searchParams.set("select", "id,sku,name,mrp,archived_at");
  productUrl.searchParams.set("limit", "1");

  const response = await fetch(productUrl, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`
    }
  });

  if (!response.ok) {
    throw new Error("Could not read product price");
  }

  const products = await response.json();
  return products[0] ?? null;
}

function getRazorpayClient() {
  const keyId = getRequiredEnv("RAZORPAY_KEY_ID");
  const keySecret = getRequiredEnv("RAZORPAY_KEY_SECRET");
  return {
    keyId,
    client: new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    })
  };
}

function normalizeAmount(value) {
  const amount = Math.round(Number(value));
  return Number.isFinite(amount) ? amount : 0;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const { keyId, client } = getRazorpayClient();
    const body = await readJsonBody(request);
    const productId = body.productId;
    const quantity = Math.max(1, Math.min(Number(body.quantity ?? 1) || 1, 25));
    let amount = normalizeAmount(body.amount);
    let receipt = body.receipt ? String(body.receipt).slice(0, 40) : `db_${Date.now()}`;
    let notes = body.notes && typeof body.notes === "object" ? body.notes : {};
    let product = null;
    let price = null;

    if (productId) {
      product = await fetchProductFromSupabase(productId);
      if (!product || product.archived_at) {
        sendJson(response, 404, { error: "Product is not available" });
        return;
      }

      price = Number(product.mrp);
      if (!Number.isFinite(price) || price <= 0) {
        sendJson(response, 400, { error: "This product does not have an online payment price yet" });
        return;
      }

      amount = Math.round(price * quantity * 100);
      receipt = `db_${String(product.sku ?? product.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 18)}_${Date.now()
        .toString()
        .slice(-8)}`;
      notes = {
        ...notes,
        product_id: String(product.id),
        sku: product.sku ?? "",
        product_name: product.name ?? "",
        quantity: String(quantity)
      };
    }

    if (amount < 100) {
      sendJson(response, 400, { error: "Amount must be at least 100 paise" });
      return;
    }

    const currency = body.currency || "INR";
    const order = await client.orders.create({
      amount,
      currency,
      receipt,
      notes
    });

    sendJson(response, 200, {
      order_id: order.id,
      id: order.id,
      keyId,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      product: product
        ? {
            id: product.id,
            sku: product.sku,
            name: product.name,
            price,
            quantity
          }
        : null
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    const statusCode = error?.statusCode === 401 || error?.error?.code === "BAD_REQUEST_ERROR" ? error.statusCode || 500 : 500;
    sendJson(response, statusCode, { error: error?.error?.description || error.message || "Could not start payment" });
  }
}
