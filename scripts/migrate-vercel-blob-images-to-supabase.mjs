import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const limitArg = [...args].find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const readKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_IMAGE_BUCKET || "products";
const vercelBlobHost = ".public.blob.vercel-storage.com";

if (!supabaseUrl || !readKey) {
  throw new Error(
    "Set SUPABASE_URL (or VITE_SUPABASE_URL) and a Supabase key before running."
  );
}

if (apply && !serviceKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is required with --apply. Never expose this key in Vite/browser variables."
  );
}

if (!Number.isFinite(limit) && limit !== Infinity) {
  throw new Error("--limit must be a positive number.");
}

const supabase = createClient(supabaseUrl, apply ? serviceKey : readKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(20_000) }),
  },
});

const isVercelBlobUrl = (value) => {
  try {
    return new URL(value).hostname.endsWith(vercelBlobHost);
  } catch {
    return false;
  }
};

const uniqueUrls = (product) =>
  [...new Set([product.image_url, ...(product.image_urls || [])].filter(Boolean))];

const safeSegment = (value) =>
  String(value || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "product";

const extensionFor = (url, contentType) => {
  const pathnameExtension = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1];
  if (pathnameExtension) return pathnameExtension.toLowerCase();
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("avif")) return "avif";
  return "jpg";
};

const migrateImage = async (product, url, index) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${url}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const extension = extensionFor(url, contentType);
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 12);
  const folder = safeSegment(product.sku || product.id);
  const objectPath = `migrated-from-vercel/${folder}/${index + 1}-${hash}.${extension}`;
  const body = await response.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(objectPath, body, {
    contentType,
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
};

const { data: products, error: selectError } = await supabase
  .from("products")
  .select("id,sku,name,image_url,image_urls")
  .order("name");

if (selectError) throw selectError;

const candidates = products
  .filter((product) => uniqueUrls(product).some(isVercelBlobUrl))
  .slice(0, limit);
const imageCount = candidates.reduce(
  (total, product) => total + uniqueUrls(product).filter(isVercelBlobUrl).length,
  0
);

console.log(
  `${apply ? "APPLY" : "DRY RUN"}: ${candidates.length} products and ${imageCount} Vercel Blob images found.`
);

if (!apply) {
  for (const product of candidates.slice(0, 20)) {
    console.log(`- ${product.sku || product.id}: ${product.name}`);
  }
  if (candidates.length > 20) {
    console.log(`…and ${candidates.length - 20} more products.`);
  }
  console.log("No files or database rows were changed. Add --apply to migrate.");
  process.exit(0);
}

let migratedProducts = 0;
let migratedImages = 0;
const failures = [];

for (const product of candidates) {
  try {
    const urls = uniqueUrls(product);
    const replacements = new Map();

    for (const [index, url] of urls.entries()) {
      if (!isVercelBlobUrl(url)) continue;
      const publicUrl = await migrateImage(product, url, index);
      replacements.set(url, publicUrl);
      migratedImages += 1;
    }

    const nextImageUrls = (product.image_urls || []).map(
      (url) => replacements.get(url) || url
    );
    const nextImageUrl =
      replacements.get(product.image_url) ||
      product.image_url ||
      nextImageUrls[0] ||
      null;

    const { error: updateError } = await supabase
      .from("products")
      .update({ image_url: nextImageUrl, image_urls: nextImageUrls })
      .eq("id", product.id);
    if (updateError) throw updateError;

    migratedProducts += 1;
    console.log(`Migrated ${product.sku || product.id}: ${replacements.size} images`);
  } catch (error) {
    failures.push({ product: product.sku || product.id, error: error.message });
    console.error(`Failed ${product.sku || product.id}: ${error.message}`);
  }
}

console.log(
  `Finished: ${migratedProducts}/${candidates.length} products and ${migratedImages}/${imageCount} images migrated.`
);
console.log("Original Vercel Blob files were not deleted, so rollback remains possible.");

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
