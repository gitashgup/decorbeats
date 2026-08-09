const PUBLIC_PRODUCT_COLUMNS = [
  "id",
  "sku",
  "name",
  "category",
  "material",
  "quantity",
  "mrp",
  "size",
  "weight",
  "marketing_tag",
  "notes",
  "image_url",
  "image_urls",
  "video_urls",
  "created_at",
  "archived_at",
  "pinned"
].join(",");

const PUBLIC_HERO_COLUMNS = [
  "id",
  "eyebrow",
  "title",
  "body",
  "cta_label",
  "cta_action",
  "content_position",
  "image_url",
  "is_active",
  "sort_order",
  "created_at"
].join(",");

function sendJson(response, statusCode, payload, cache = false) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader(
    "Cache-Control",
    cache ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store"
  );
  response.end(JSON.stringify(payload));
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

async function fetchTable(supabaseUrl, anonKey, table, searchParams) {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    },
    signal: AbortSignal.timeout(8_000)
  });

  if (!response.ok) {
    throw new Error(`Could not load ${table}`);
  }
  return response.json();
}

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const supabaseUrl = getRequiredEnv("VITE_SUPABASE_URL");
    const anonKey = getRequiredEnv("VITE_SUPABASE_ANON_KEY");
    const [products, heroSlides] = await Promise.all([
      fetchTable(supabaseUrl, anonKey, "products", {
        select: PUBLIC_PRODUCT_COLUMNS,
        order: "created_at.desc"
      }),
      fetchTable(supabaseUrl, anonKey, "hero_slides", {
        select: PUBLIC_HERO_COLUMNS,
        is_active: "eq.true",
        order: "sort_order.asc"
      })
    ]);

    sendJson(
      response,
      200,
      { products, heroSlides, generatedAt: new Date().toISOString() },
      true
    );
  } catch (error) {
    console.error("Public catalogue error:", error);
    sendJson(response, 503, {
      error: "The catalogue is temporarily unavailable. Please try again."
    });
  }
}
