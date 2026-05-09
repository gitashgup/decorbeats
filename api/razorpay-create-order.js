const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

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

function getBasicAuthHeader(keyId, keySecret) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
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

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const keyId = getRequiredEnv("RAZORPAY_KEY_ID");
    const keySecret = getRequiredEnv("RAZORPAY_KEY_SECRET");
    const body = await readJsonBody(request);
    const productId = body.productId;
    const quantity = Math.max(1, Math.min(Number(body.quantity ?? 1) || 1, 25));

    if (!productId) {
      sendJson(response, 400, { error: "Product is required" });
      return;
    }

    const product = await fetchProductFromSupabase(productId);
    if (!product || product.archived_at) {
      sendJson(response, 404, { error: "Product is not available" });
      return;
    }

    const price = Number(product.mrp);
    if (!Number.isFinite(price) || price <= 0) {
      sendJson(response, 400, { error: "This product does not have an online payment price yet" });
      return;
    }

    const amount = Math.round(price * quantity * 100);
    const receipt = `db_${String(product.sku ?? product.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 18)}_${Date.now()
      .toString()
      .slice(-8)}`;

    const orderResponse = await fetch(RAZORPAY_ORDERS_URL, {
      method: "POST",
      headers: {
        Authorization: getBasicAuthHeader(keyId, keySecret),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: {
          product_id: String(product.id),
          sku: product.sku ?? "",
          product_name: product.name ?? "",
          quantity: String(quantity)
        }
      })
    });

    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      sendJson(response, orderResponse.status, { error: order?.error?.description || "Could not create payment order" });
      return;
    }

    sendJson(response, 200, {
      keyId,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        price,
        quantity
      }
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    sendJson(response, 500, { error: error.message || "Could not start payment" });
  }
}
