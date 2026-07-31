import React, { useEffect, useMemo, useRef, useState } from "react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
let supabase = null;
let supabaseClientPromise = null;

async function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (supabase) {
    return supabase;
  }
  if (!supabaseClientPromise) {
    supabaseClientPromise = import("./lib/supabase").then((module) => {
      supabase = module.supabase;
      return supabase;
    });
  }
  return supabaseClientPromise;
}

const brandLogo = "/assets/brand/decorbeats-logo.svg";
const WHATSAPP_NUMBER = "919811133661";
const PRODUCT_STORAGE_BUCKET = "products";
const CART_STORAGE_KEY = "decorbeats-cart-v1";
const RAZORPAY_CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const GOOGLE_ADS_CONTACT_CONVERSION = "AW-18084439764/kF1hCNnLiK4cENTNqq9D";
const ANNOUNCEMENTS = [
  "Varalakshmi gifts now live",
  "Handpicked in Moradabad",
  "Pan-India delivery"
];
const TICKER_MESSAGES = [
  { text: "VARALAKSHMI GIFTS · AUSPICIOUS BRASS FOR BEAUTIFUL HOMES", action: "collection" },
  { text: "THE BRASS HOUSE OF INDIA · ROOTED IN MORADABAD", action: null },
  { text: "50–400+ PIECES · CUSTOM BUSINESS & OCCASION GIFTING", action: "whatsapp" },
  { text: "PAN-INDIA DELIVERY · PERSONAL HELP FROM A BRASS SPECIALIST", action: "whatsapp" }
];
const emptyForm = {
  id: "",
  name: "",
  category: "Decor",
  material: "Metal",
  quantity: 0,
  mrp: "",
  costPrice: "",
  b2b: "",
  size: "",
  weight: "",
  marketingTag: "",
  notes: "",
  imageUrl: "",
  videoUrl: ""
};

const categoryOptions = ["Bell", "Bowl", "Box", "Decor", "Diya", "Jars", "Misc", "Planter", "Plate", "Tree", "Urli", "Wall Decor"];
const materialOptions = ["Brass", "Metal", "Ceramic", "Wood", "Glass", "Clay", "Mixed", "Other"];
const marketingTagOptions = ["", "Featured", "New Arrival", "Best for Gifting", "Festive Pick", "Handpicked", "Limited Edition"];
const customerOccasions = [
  {
    label: "Pooja & Ritual",
    category: "Diya",
    note: "Diyas, lamps and sacred accents",
    beat: "For everyday devotion",
    preferredImageProducts: ["Hanging Peacock Brass Diya"]
  },
  { label: "Brass for Home", category: "Decor", note: "Objects that warm every room", beat: "For considered spaces" },
  { label: "Festive Gifts", category: "Box", note: "Meaningful keepsakes and gift sets", beat: "For generous moments" },
  { label: "Statement Walls", category: "Wall Decor", note: "Sculptural details with presence", beat: "For memorable rooms" }
];
const CUSTOMER_COLLECTIONS = [
  { id: "all", label: "Shop All", path: "/" },
  {
    id: "varalakshmi",
    label: "Varalakshmi Gifts",
    path: "/category/varalakshmi",
    categories: ["Diya", "Urli"],
    terms: ["diya", "deepam", "lamp", "urli", "lakshmi", "kamakshi"]
  },
  {
    id: "pooja-diyas",
    label: "Pooja & Diyas",
    path: "/category/pooja-diyas",
    categories: ["Diya"],
    terms: ["diya", "deepam", "lamp", "ghanti", "loban", "pooja", "puja", "shankh", "shakh", "chakra"]
  },
  {
    id: "urlis-serveware",
    label: "Urlis & Serveware",
    path: "/category/urlis-serveware",
    categories: ["Urli", "Bowl", "Plate", "Jars"],
    terms: ["urli", "bowl", "plate", "tray", "serve", "cup", "jar", "basket"]
  },
  {
    id: "idols-spiritual",
    label: "Idols & Spiritual",
    path: "/category/idols-spiritual",
    categories: ["Idol"],
    terms: ["ganesh", "ganesha", "krishna", "lakshmi", "kamakshi", "durga", "saraswati", "ram darbar", "hanuman", "buddha", "avatar"]
  },
  {
    id: "wall-home",
    label: "Wall & Hanging",
    path: "/category/wall-home",
    categories: ["Wall Decor", "Bell"],
    terms: ["wall", "hanging", "bell", "ghanti"]
  },
  {
    id: "festive-gifts",
    label: "Festive Gifts",
    path: "/category/festive-gifts",
    categories: ["Box"],
    terms: ["gift", "festive", "boxed", "box set"]
  },
  {
    id: "home-accents",
    label: "Décor & Accents",
    path: "/category/home-accents",
    categories: ["Decor", "Planter", "Tree", "Misc"],
    terms: ["planter", "tree", "candle", "decor", "accent"]
  }
];
const CUSTOMER_COLLECTION_ALIASES = new Map([
  ["", "all"],
  ["all", "all"],
  ["shop-all", "all"],
  ["diya", "pooja-diyas"],
  ["pooja-and-diyas", "pooja-diyas"],
  ["pooja-diyas", "pooja-diyas"],
  ["urli", "urlis-serveware"],
  ["bowl", "urlis-serveware"],
  ["plate", "urlis-serveware"],
  ["jars", "urlis-serveware"],
  ["urlis-and-serveware", "urlis-serveware"],
  ["urlis-serveware", "urlis-serveware"],
  ["idol", "idols-spiritual"],
  ["idols-and-spiritual", "idols-spiritual"],
  ["idols-spiritual", "idols-spiritual"],
  ["wall-decor", "wall-home"],
  ["bell", "wall-home"],
  ["wall-and-hanging", "wall-home"],
  ["wall-home", "wall-home"],
  ["box", "festive-gifts"],
  ["gifting", "festive-gifts"],
  ["festive-gifts", "festive-gifts"],
  ["decor", "home-accents"],
  ["planter", "home-accents"],
  ["tree", "home-accents"],
  ["misc", "home-accents"],
  ["home-decor", "home-accents"],
  ["home-accents", "home-accents"],
  ["varalakshmi", "varalakshmi"],
  ["varalakshmi-gifts", "varalakshmi"]
]);
const VARALAKSHMI_EDIT_NAMES = [
  "Small Brass Diyas in Gift Box — Set of 2",
  "Designer Brass Diya",
  "Brass Urli Diya Design",
  "Peacock Rim Brass Diya",
  "Hanging Peacock Brass Diya",
  "Copper & Brass Diya in Gift Box",
  "Brass Diyas in Red Gift Box — Set of 3",
  "Peacock Three-Step Brass Diya"
];
const CUSTOMER_FEATURED_PRODUCT_NAMES = [
  ...VARALAKSHMI_EDIT_NAMES,
  "Brass Bowl & Spoon Gift Box — Set of 2",
  "Elephant Urli Pair",
  "Ganesha Brass Murti",
  "Big Kamal wall",
  "Brass Coconut Tree Décor — Set of 2",
  "Brass Deer Candle Stand",
  "Coffee Cup Set Premium",
  "Hanging peacock bell"
];
const CUSTOMER_FEATURED_PRODUCT_RANK = new Map(
  CUSTOMER_FEATURED_PRODUCT_NAMES.map((name, index) => [name.toLowerCase(), index])
);
const defaultHeroSlides = [
  {
    id: "default-varalakshmi",
    eyebrow: "Varalakshmi gifting · Curated by brass specialists",
    title: "Bring home|blessings in brass.",
    body: "Auspicious diyas and meaningful gifts, handpicked in Moradabad and delivered across India for homes filled with light and abundance.",
    ctaLabel: "Shop Varalakshmi gifts",
    ctaAction: "collection",
    collectionId: "varalakshmi",
    contentPosition: "left",
    imageUrl: "/assets/images/decorbeats-varalakshmi-gifting-v3.jpg",
    mobileImageUrl: "/assets/images/decorbeats-varalakshmi-gifting-mobile-v3.jpg",
    active: true,
    sortOrder: 0
  },
  {
    id: "default-credibility",
    eyebrow: "From Moradabad · India’s brass city",
    title: "India’s home|of brass.",
    body: "Brass décor, pooja essentials, serveware and gifts—sourced, finished and curated by specialists with roots in Pital Nagri.",
    ctaLabel: "Explore brass collection",
    ctaAction: "collection",
    collectionId: "all",
    contentPosition: "left",
    imageUrl: "/assets/images/decorbeats-atelier-campaign-v2.jpg",
    mobileImageUrl: "/assets/images/decorbeats-atelier-campaign-mobile-v2.jpg",
    active: true,
    sortOrder: 1
  }
];

function getStoredCartItems() {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(stored)
      ? stored
          .filter((item) => item && item.productId != null)
          .map((item) => ({
            productId: item.productId,
            quantity: Math.max(1, Math.min(Number(item.quantity || 1) || 1, 25))
          }))
      : [];
  } catch {
    return [];
  }
}

const materialSkuCodes = {
  Brass: "BR",
  Metal: "MT",
  Ceramic: "CR",
  Wood: "WD",
  Glass: "GL",
  Clay: "CL",
  Mixed: "MX",
  Other: "OT"
};

const categorySkuCodes = {
  Bell: "BELL",
  Bowl: "BOWL",
  Box: "BOX",
  Decor: "DECOR",
  Diya: "DIYA",
  Jars: "JARS",
  Misc: "MISC",
  Planter: "PLANT",
  Plate: "PLATE",
  Tree: "TREE",
  Urli: "URLI",
  "Wall Decor": "WALL"
};

function getInitialPublicScreen() {
  if (typeof window === "undefined") {
    return "customer";
  }

  return window.location.pathname === "/admin" ? "admin-auth" : "customer";
}

function humanizeSlug(slug) {
  return String(slug ?? "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseLegacyPath(pathname) {
  const path = String(pathname ?? "/");

  if (path === "/admin" || path.startsWith("/admin/")) {
    return { screen: "admin-auth", type: "admin", slug: "" };
  }

  const catalogueMatch = path.match(/^\/(?:catalogue|catalog)\/([^/]+)\/?$/i);
  if (catalogueMatch) {
    return { screen: "catalogue", type: "catalogue", slug: catalogueMatch[1] };
  }

  const categoryMatch = path.match(/^\/category\/([^/]+)\/?$/i);
  if (categoryMatch) {
    return { screen: "customer", type: "category", slug: categoryMatch[1] };
  }

  const productMatch = path.match(/^\/(?:product-page|product)\/([^/]+)\/?$/i);
  if (productMatch) {
    return { screen: "customer", type: "product", slug: productMatch[1] };
  }

  return { screen: "customer", type: "home", slug: "" };
}

const emptyInquiryDraft = {
  customer_name: "",
  customer_phone: "",
  source: "phone",
  occasion: "",
  required_by_date: "",
  budget_per_unit: "",
  total_budget: "",
  notes: "",
  products: [{ product_name: "", matched_sku: "", quantity_requested: "", quoted_price: "" }]
};

const inquiryStatusOrder = ["new", "quoted", "converted", "lost"];
const catalogueLeadTimeOptions = [
  "Ready to ship",
  "2-3 days",
  "3-5 days",
  "5-7 days",
  "7-10 days",
  "10-15 days",
  "Procure on order"
];

function isHeicLikeFile(file) {
  if (!file) {
    return false;
  }

  const lowerName = file.name?.toLowerCase?.() ?? "";
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif") ||
    file.type === ""
  );
}

const CATALOGUE_IMAGE_SIZE = 1200;
const CATALOGUE_IMAGE_MAX_CONTENT = 1060;
const DECORBEATS_CREAM_RGB = "245, 237, 227";
const DECORBEATS_BROWN_RGB = "139, 74, 42";

async function compressImage(file, maxWidthPx = CATALOGUE_IMAGE_SIZE, qualityPercent = 0.82, onStatusChange = () => {}) {
  if (isHeicLikeFile(file)) {
    onStatusChange("Converting iPhone photo...");
  } else {
    onStatusChange("Creating Decorbeats catalogue image...");
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const canvasSize = maxWidthPx;
        const maxContentSize = Math.min(CATALOGUE_IMAGE_MAX_CONTENT, Math.round(canvasSize * 0.88));
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxContentSize || height > maxContentSize) {
          const scale = Math.min(maxContentSize / width, maxContentSize / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        const backgroundGradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
        backgroundGradient.addColorStop(0, `rgb(${DECORBEATS_CREAM_RGB})`);
        backgroundGradient.addColorStop(0.58, "rgb(250, 245, 238)");
        backgroundGradient.addColorStop(1, "rgb(232, 213, 183)");
        ctx.fillStyle = backgroundGradient;
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        // A very subtle "beats" motif keeps the image branded without distracting from the product.
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = `rgb(${DECORBEATS_BROWN_RGB})`;
        ctx.font = `${Math.round(canvasSize * 0.16)}px Georgia, serif`;
        ctx.fillText("♪", canvasSize * 0.08, canvasSize * 0.2);
        ctx.fillText("♫", canvasSize * 0.82, canvasSize * 0.88);
        ctx.restore();

        const x = Math.round((canvasSize - width) / 2);
        const y = Math.round((canvasSize - height) / 2);

        ctx.save();
        ctx.shadowColor = "rgba(44, 24, 16, 0.16)";
        ctx.shadowBlur = Math.round(canvasSize * 0.035);
        ctx.shadowOffsetY = Math.round(canvasSize * 0.025);
        ctx.drawImage(img, x, y, width, height);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = `rgb(${DECORBEATS_BROWN_RGB})`;
        ctx.font = `${Math.round(canvasSize * 0.032)}px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.fillText("Decorbeats", canvasSize / 2, canvasSize - Math.round(canvasSize * 0.055));
        ctx.restore();

        canvas.toBlob(
          (blob) => {
            resolve(
              new File([blob || file], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: "image/jpeg"
              })
            );
          },
          "image/jpeg",
          qualityPercent
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  });
}

async function compressHeroSlideImage(file, maxWidthPx = 2000, qualityPercent = 0.9, onStatusChange = () => {}) {
  onStatusChange(isHeicLikeFile(file) ? "Converting slider image..." : "Optimising slider image...");

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxWidthPx) {
          height = Math.round((height * maxWidthPx) / width);
          width = maxWidthPx;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(
              new File([blob || file], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: "image/jpeg"
              })
            );
          },
          "image/jpeg",
          qualityPercent
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  }
  return `${Math.round(bytes / 1024)}KB`;
}

function isNewArrival(createdAt) {
  if (!createdAt) {
    return false;
  }
  const parsedCreatedAt = new Date(createdAt);
  if (Number.isNaN(parsedCreatedAt.getTime())) {
    return false;
  }
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return parsedCreatedAt > sevenDaysAgo;
}

function openWhatsAppChat(message) {
  if (typeof window === "undefined") {
    return;
  }
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  const anchor = document.createElement("a");
  anchor.href = whatsappUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

const BULK_WHATSAPP_MESSAGE =
  "Hi Decorbeats! I am interested in placing a bulk order of 50+ units. Please share your catalogue, pricing and delivery details.";
const RETAIL_WHATSAPP_MESSAGE =
  "Hi Decorbeats! I am choosing a brass piece for my home or an occasion. Could a brass specialist help me find the right product?";

function trackCustomerEvent(eventName, properties = {}) {
  void import("@vercel/analytics")
    .then(({ track }) =>
      track(eventName, {
        ...properties,
        surface: "customer"
      })
    )
    .catch((error) => {
      console.debug("Analytics event skipped:", eventName, error);
    });
}

function trackGoogleAdsContactConversion(value = 1) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("event", "conversion", {
    send_to: GOOGLE_ADS_CONTACT_CONVERSION,
    value: Number(value) || 1,
    currency: "INR"
  });
}

function trackCommerceEvent(eventName, { transactionId, value, items = [] } = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("event", eventName, {
    ...(transactionId ? { transaction_id: transactionId } : {}),
    ...(Number.isFinite(Number(value)) ? { value: Number(value) } : {}),
    currency: "INR",
    items
  });
}

function toCommerceItem(product, quantity = 1) {
  return {
    item_id: product?.sku || String(product?.id || ""),
    item_name: product?.name || "Decorbeats product",
    item_category: product?.category || "",
    price: parsePrice(product?.pricing?.mrp) || 0,
    quantity
  };
}

function trackBulkWhatsAppClick(source) {
  trackCustomerEvent("Bulk WhatsApp Clicked", { source });
  trackGoogleAdsContactConversion();
}

function trackRetailWhatsAppClick(source) {
  trackCustomerEvent("Retail WhatsApp Clicked", { source });
  trackGoogleAdsContactConversion();
}

function openBulkWhatsApp(source = "direct") {
  trackBulkWhatsAppClick(source);
  openWhatsAppChat(BULK_WHATSAPP_MESSAGE);
}

function getBulkWhatsAppUrl() {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(BULK_WHATSAPP_MESSAGE)}`;
}

function getRetailWhatsAppUrl() {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(RETAIL_WHATSAPP_MESSAGE)}`;
}

function getProductWhatsAppUrl(product) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi Decorbeats! 👋\n\nI'm interested in *${product.name}*\n\nSKU: ${product.sku}\nPrice: ${
      hasDisplayValue(product?.pricing?.mrp) ? "₹" + product.pricing.mrp : "Please share price"
    }\n\nCould you please share more details?\n\nThank you!`
  )}`;
}

function toInquiry(raw) {
  return {
    id: raw.id,
    createdAt: raw.created_at,
    customerName: safeText(raw.customer_name, "Unnamed inquiry"),
    customerPhone: safeText(raw.customer_phone),
    source: safeText(raw.source, "phone"),
    occasion: safeText(raw.occasion),
    requiredByDate: safeText(raw.required_by_date),
    budgetPerUnit: raw.budget_per_unit,
    totalBudget: raw.total_budget,
    status: safeText(raw.status, "new").toLowerCase(),
    rawTranscript: safeText(raw.raw_transcript),
    notes: safeText(raw.notes),
    items: Array.isArray(raw.inquiry_items)
      ? raw.inquiry_items.map((item) => ({
          id: item.id,
          productSku: safeText(item.product_sku),
          productName: safeText(item.product_name),
          quantityRequested: Number(item.quantity_requested ?? 0),
          quotedPrice: item.quoted_price
        }))
      : []
  };
}

function toSale(raw) {
  return {
    id: raw.id,
    createdAt: raw.created_at,
    customerName: safeText(raw.customer_name, "Walk-in sale"),
    paymentMethod: safeText(raw.payment_method, "upi").toLowerCase(),
    paymentStatus: safeText(raw.payment_status, "paid").toLowerCase(),
    notes: safeText(raw.notes),
    totalAmount: Number(raw.total_amount ?? 0),
    items: Array.isArray(raw.sale_items)
      ? raw.sale_items.map((item) => ({
          id: item.id,
          productSku: safeText(item.product_sku),
          productName: safeText(item.product_name),
          quantitySold: Number(item.quantity_sold ?? 0),
          sellingPrice: Number(item.selling_price ?? 0),
          costPrice: item.cost_price == null ? null : Number(item.cost_price)
        }))
      : []
  };
}

function isMissingSaleRpcError(error) {
  const message = safeText(error?.message).toLowerCase();
  return error?.code === "PGRST202" || message.includes("record_sale_with_items") || message.includes("could not find the function");
}

function isMissingDeleteSaleRpcError(error) {
  const message = safeText(error?.message).toLowerCase();
  return error?.code === "PGRST202" || message.includes("delete_sale_and_restore_stock") || message.includes("could not find the function");
}

function formatSaleSaveError(error) {
  const message = safeText(error?.message);
  if (isMissingSaleRpcError(error)) {
    return "The safe sale-saving function is not installed in Supabase yet. Please run the latest sales SQL migration, then try again.";
  }
  if (message === "Load failed" || error?.name === "TypeError") {
    return "Could not reach Supabase from this phone. Please check the connection, then try once more. If it repeats, update the app after the next deploy.";
  }
  if (message.toLowerCase().includes("row-level security")) {
    return "Supabase security is blocking this sale. Please check the sales, sale_items, and products RLS policies.";
  }
  return message || "Could not save this sale.";
}

function saleFromRpcData(data) {
  const payload = Array.isArray(data) ? data[0] : data;
  if (!payload) {
    return null;
  }
  if (payload.sale && Array.isArray(payload.sale_items)) {
    return toSale({ ...payload.sale, sale_items: payload.sale_items });
  }
  if (payload.id) {
    return toSale(payload);
  }
  return null;
}

function toPurchase(raw) {
  const totalAmount = Number(raw.total_amount ?? 0);
  const amountPaid = Number(raw.amount_paid ?? 0);
  const balanceDue = raw.balance_due == null ? Math.max(0, totalAmount - amountPaid) : Number(raw.balance_due ?? 0);
  return {
    id: raw.id,
    createdAt: raw.created_at,
    vendorName: safeText(raw.vendor_name, "Unnamed vendor"),
    vendorPhone: safeText(raw.vendor_phone),
    orderDate: safeText(raw.order_date),
    expectedDeliveryDate: safeText(raw.expected_delivery_date),
    status: safeText(raw.status, "planned").toLowerCase(),
    notes: safeText(raw.notes),
    totalAmount,
    amountPaid,
    balanceDue,
    referenceImageUrl: normalizeUrl(raw.reference_image_url),
    items: Array.isArray(raw.purchase_items)
      ? raw.purchase_items.map((item) => ({
          id: item.id,
          productSku: safeText(item.product_sku),
          productName: safeText(item.product_name),
          quantityOrdered: Number(item.quantity_ordered ?? 0),
          costPrice: item.cost_price == null ? null : Number(item.cost_price),
          lineTotal: item.line_total == null ? null : Number(item.line_total)
        }))
      : []
  };
}

function createCatalogueItemDraft(product = null, overrides = {}) {
  return {
    client_id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `catalogue-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    product_id: product?.id ? String(product.id) : "",
    product_sku: product?.sku ?? "",
    product_name: product?.name ?? "",
    display_price: product?.pricing?.mrp ?? "",
    display_quantity: product ? Math.max(0, Number(product.quantity || 0)) : "",
    lead_time: "Ready to ship",
    customer_note: "",
    ...overrides
  };
}

function createEmptyCatalogueDraft() {
  return {
    title: "",
    customer_name: "",
    occasion: "",
    intro_note: "",
    expires_at: "",
    items: []
  };
}

function toShareCatalogue(raw) {
  return {
    id: raw.id,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    title: safeText(raw.title, "Decorbeats catalogue"),
    slug: safeText(raw.slug),
    customerName: safeText(raw.customer_name),
    occasion: safeText(raw.occasion),
    introNote: safeText(raw.intro_note),
    status: safeText(raw.status, "active").toLowerCase(),
    expiresAt: raw.expires_at ?? null,
    items: Array.isArray(raw.share_catalogue_items)
      ? raw.share_catalogue_items
          .map((item) => ({
            id: item.id,
            catalogueId: item.catalogue_id,
            productId: safeText(item.product_id),
            productSku: safeText(item.product_sku),
            productName: safeText(item.product_name),
            displayPrice: item.display_price == null ? null : Number(item.display_price),
            displayQuantity: item.display_quantity == null ? null : Number(item.display_quantity),
            leadTime: safeText(item.lead_time, "Ready to ship"),
            customerNote: safeText(item.customer_note),
            sortOrder: Number(item.sort_order ?? 1)
          }))
          .sort((left, right) => left.sortOrder - right.sortOrder)
      : []
  };
}

function buildShareCatalogueSlug(title) {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slugify(title || "decorbeats-catalogue")}-${suffix}`;
}

function buildShareCatalogueUrl(slug) {
  const origin = typeof window === "undefined" ? "https://www.decorbeats.com" : window.location.origin;
  return `${origin}/catalogue/${slug}`;
}

function getCatalogueProduct(item, products) {
  return (
    products.find((product) => String(product.id) === String(item.productId)) ||
    products.find((product) => product.sku && product.sku === item.productSku) ||
    null
  );
}

function getCatalogueShareMessage(catalogue) {
  const lines = catalogue.items
    .slice(0, 8)
    .map((item) => {
      const quantity = item.displayQuantity ? ` (${item.displayQuantity} available)` : "";
      const price = item.displayPrice ? ` - ₹${item.displayPrice}` : "";
      const leadTime = item.leadTime ? ` - ${item.leadTime}` : "";
      return `• ${item.productName || item.productSku}${quantity}${price}${leadTime}`;
    })
    .join("\n");

  return `Hi Decorbeats! I checked the catalogue "${catalogue.title}".\n\n${lines}\n\nCan you help me with these options?`;
}

function createEmptySaleDraft() {
  return {
    customer_name: "",
    payment_method: "upi",
    payment_status: "paid",
    notes: "",
    items: []
  };
}

function createPurchaseItemDraft(overrides = {}) {
  return {
    client_id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `purchase-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    product_sku: "",
    product_name: "",
    quantity_ordered: "",
    cost_price: "",
    line_total: "",
    ...overrides
  };
}

function createEmptyPurchaseDraft() {
  return {
    vendor_name: "",
    vendor_phone: "",
    order_date: new Date().toISOString().slice(0, 10),
    expected_delivery_date: "",
    status: "ordered",
    total_amount: "",
    amount_paid: "",
    notes: "",
    reference_image_url: "",
    items: [createPurchaseItemDraft()]
  };
}

function createEmptyCheckoutDetails() {
  return {
    customerName: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    notes: ""
  };
}

function getCartLineId(product) {
  return String(product?.id ?? product?.sku ?? "");
}

function formatPaymentMethod(value) {
  return safeText(value, "upi").toUpperCase();
}

function formatPaymentStatus(value) {
  const normalized = safeText(value, "paid").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatSaleDate(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatPurchaseDate(value) {
  if (!value) {
    return "Not set";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(parsed);
}

function formatInquiryStatus(status) {
  const normalized = safeText(status, "new").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatPurchaseStatus(status) {
  return safeText(status, "planned")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createEmptyInquiryDraft() {
  return JSON.parse(JSON.stringify(emptyInquiryDraft));
}

function normalizeInquiryDraft(payload, products = []) {
  const normalizedProducts = Array.isArray(payload?.products) && payload.products.length ? payload.products : emptyInquiryDraft.products;
  return {
    customer_name: safeText(payload?.customer_name),
    customer_phone: safeText(payload?.customer_phone),
    source: ["phone", "whatsapp", "walkin"].includes(safeText(payload?.source).toLowerCase())
      ? safeText(payload?.source).toLowerCase()
      : "phone",
    occasion: safeText(payload?.occasion),
    required_by_date: safeText(payload?.required_by_date),
    budget_per_unit: payload?.budget_per_unit ?? "",
    total_budget: payload?.total_budget ?? "",
    notes: safeText(payload?.notes),
    products: normalizedProducts.map((item) => {
      const productName = safeText(item?.product_name);
      const matched = findMatchingProduct(products, productName);
      return {
        product_name: productName,
        matched_sku: matched?.sku ?? "",
        quantity_requested: item?.quantity_requested ?? "",
        quoted_price: item?.quoted_price ?? ""
      };
    })
  };
}

function scoreProductMatch(product, query) {
  if (!query) {
    return 0;
  }
  const normalizedQuery = query.toLowerCase();
  const name = safeText(product.name).toLowerCase();
  const sku = safeText(product.sku).toLowerCase();
  if (name === normalizedQuery || sku === normalizedQuery) {
    return 100;
  }
  let score = 0;
  if (name.includes(normalizedQuery)) {
    score += 70;
  }
  if (normalizedQuery.includes(name) && name) {
    score += 35;
  }
  if (sku.includes(normalizedQuery) || normalizedQuery.includes(sku)) {
    score += 45;
  }
  normalizedQuery.split(/\s+/).forEach((token) => {
    if (token && name.includes(token)) {
      score += 8;
    }
  });
  return score;
}

function findMatchingProduct(products, query) {
  if (!query) {
    return null;
  }
  let best = null;
  let bestScore = 0;
  products.forEach((product) => {
    const score = scoreProductMatch(product, query);
    if (score > bestScore) {
      best = product;
      bestScore = score;
    }
  });
  return bestScore >= 40 ? best : null;
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" fill="currentColor" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.5 5A3.5 3.5 0 0 0 2 8.5v6A3.5 3.5 0 0 0 5.5 18H7v3l3.18-3H18.5A3.5 3.5 0 0 0 22 14.5v-6A3.5 3.5 0 0 0 18.5 5h-13Zm2.5 5h8v2H8v-2Zm0-3h6v2H8V7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V22h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-3.07A7 7 0 0 1 5 12a1 1 0 1 1 2 0 5 5 0 1 0 10 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3 2.5 19.5A1.2 1.2 0 0 0 3.55 21h16.9a1.2 1.2 0 0 0 1.05-1.5L12 3Zm-1 6h2v5h-2V9Zm0 7h2v2h-2v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m19.14 12.94.04-.94-.04-.94 2.02-1.58a.7.7 0 0 0 .17-.9l-1.91-3.3a.7.7 0 0 0-.85-.3l-2.39.96a7.65 7.65 0 0 0-1.62-.94L14.2 2.4a.7.7 0 0 0-.69-.56h-3.02a.7.7 0 0 0-.69.56L9.44 5a7.65 7.65 0 0 0-1.62.94l-2.39-.96a.7.7 0 0 0-.85.3L2.67 8.58a.7.7 0 0 0 .17.9l2.02 1.58-.04.94.04.94-2.02 1.58a.7.7 0 0 0-.17.9l1.91 3.3a.7.7 0 0 0 .85.3l2.39-.96c.5.38 1.05.7 1.62.94l.36 2.6a.7.7 0 0 0 .69.56h3.02a.7.7 0 0 0 .69-.56l.36-2.6c.57-.24 1.12-.56 1.62-.94l2.39.96a.7.7 0 0 0 .85-.3l1.91-3.3a.7.7 0 0 0-.17-.9l-2.02-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v15.4l-2.6-1.6-2.3 1.6-2.1-1.6-2.1 1.6-2.3-1.6-2.6 1.6V5A1.5 1.5 0 0 1 6 3.5Zm1.5 4v1.8h9V7.5h-9Zm0 4v1.8h6.4v-1.8H7.5Zm0 4v1.8h9v-1.8h-9Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.8 4 6.6v10.8l8 3.8 8-3.8V6.6l-8-3.8Zm0 2.2 5.4 2.57L12 10.17 6.6 7.57 12 5Zm-6 4.14 5 2.37v6.92l-5-2.38V9.14Zm7 9.3v-6.92l5-2.37v6.91l-5 2.38Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10.5 4a6.5 6.5 0 1 0 4.06 11.58l4.43 4.42 1.41-1.41-4.42-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
        fill="currentColor"
      />
    </svg>
  );
}

function parseNumber(value) {
  const cleaned = String(value ?? "")
    .replace(/[^0-9.]/g, "")
    .trim();
  if (!cleaned) {
    return null;
  }
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function safeText(value, fallback = "") {
  return String(value ?? "").trim() || fallback;
}

const productNameCorrections = new Map([
  ["braas shiva head heavy", "Heavy Brass Shiva Head"],
  ["brass bowl spoon in gift bax set of 2", "Brass Bowl & Spoon Gift Box — Set of 2"],
  ["brass coconut tree home decor set of 2", "Brass Coconut Tree Décor — Set of 2"],
  ["brass diya big designer", "Designer Brass Diya"],
  ["brass shakh", "Decorative Brass Shankh"],
  ["copper and brass diya big in box", "Copper & Brass Diya in Gift Box"],
  ["coffe cup set", "Coffee Cup Set"],
  ["coffe cup set premium", "Coffee Cup Set Premium"],
  ["dasavatar gift set", "Dashavatara Brass Gift Set"],
  ["dus avatar set", "Dashavatara Brass Set"],
  ["elephant urli set", "Elephant Urli Pair"],
  ["brass gamesha 4 inch", "Brass Ganesha — 4 inch"],
  ["brass urli diya design", "Brass Urli Diya Design"],
  ["hanging peacock diya with chain heavy", "Hanging Peacock Brass Diya"],
  ["horse set", "Brass Horse Pair"],
  ["metal gold plated basket", "Gold-Finish Metal Basket"],
  ["peacock 3 step diya", "Peacock Three-Step Brass Diya"],
  ["peacock diya big rim", "Peacock Rim Brass Diya"],
  ["shakh chakra diya set", "Shankh Chakra Diya Set"],
  ["small brass diya in gift box set of 2", "Small Brass Diyas in Gift Box — Set of 2"],
  ["tlight holder", "Tealight Holder"],
  ["3 diya in a red gift box", "Brass Diyas in Red Gift Box — Set of 3"]
]);

function normalizeProductName(value) {
  const name = safeText(value);
  return productNameCorrections.get(name.toLowerCase()) ?? name;
}

function normalizeProductCategory(value) {
  const category = safeText(value, "Uncategorized");
  return categoryOptions.find((option) => option.toLowerCase() === category.toLowerCase()) ?? category;
}

function resolveCustomerCollectionId(value) {
  const normalized = slugify(safeText(value)).toLowerCase();
  return (
    CUSTOMER_COLLECTIONS.find((collection) => collection.id === normalized)?.id ??
    CUSTOMER_COLLECTION_ALIASES.get(normalized) ??
    null
  );
}

function getCustomerCollectionById(value) {
  const collectionId = resolveCustomerCollectionId(value) ?? "all";
  return CUSTOMER_COLLECTIONS.find((collection) => collection.id === collectionId) ?? CUSTOMER_COLLECTIONS[0];
}

function getCustomerProductHaystack(product) {
  return [
    product?.name,
    product?.category,
    product?.material,
    product?.marketingTag,
    getCustomerProductStory(product)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesCustomerCollection(product, value) {
  const collection = getCustomerCollectionById(value);
  if (collection.id === "all") {
    return true;
  }

  const normalizedCategory = safeText(product?.category).toLowerCase();
  const categoryMatch = (collection.categories ?? []).some(
    (category) => category.toLowerCase() === normalizedCategory
  );
  const haystack = getCustomerProductHaystack(product);
  const termMatch = (collection.terms ?? []).some((term) => haystack.includes(term));

  if (collection.id === "varalakshmi") {
    const curatedMatch = VARALAKSHMI_EDIT_NAMES.some(
      (name) => name.toLowerCase() === safeText(product?.name).toLowerCase()
    );
    return safeText(product?.material).toLowerCase() === "brass" && (curatedMatch || categoryMatch || termMatch);
  }

  return categoryMatch || termMatch;
}

function isCustomerSellReady(product) {
  return Boolean(
    product &&
      getPrimaryImage(product) &&
      parsePrice(product?.pricing?.mrp) &&
      Number(product?.quantity || 0) > 0
  );
}

function getCustomerFeaturedRank(product) {
  return CUSTOMER_FEATURED_PRODUCT_RANK.get(safeText(product?.name).toLowerCase()) ?? Number.POSITIVE_INFINITY;
}

function getCustomerProductCollectionLabel(product) {
  const preferredOrder = [
    "pooja-diyas",
    "urlis-serveware",
    "idols-spiritual",
    "wall-home",
    "festive-gifts",
    "home-accents"
  ];
  const matchedId = preferredOrder.find((collectionId) => matchesCustomerCollection(product, collectionId));
  return getCustomerCollectionById(matchedId ?? "home-accents").label;
}

function getProductExpertNote(product) {
  const collectionId = resolveCustomerCollectionId(
    CUSTOMER_COLLECTIONS.find((collection) => collection.label === getCustomerProductCollectionLabel(product))?.id
  );
  const notes = {
    "pooja-diyas": "A meaningful choice for pooja rooms, festive rituals and gifts that bring warmth to the home.",
    "urlis-serveware": "A decorative centrepiece selected for tables, entrances and festive styling with presence.",
    "idols-spiritual": "A devotional accent chosen to bring material richness and quiet presence to a sacred corner.",
    "wall-home": "A sculptural detail selected to add dimension, warmth and a distinctly Indian character to the room.",
    "festive-gifts": "A memorable keepsake selected for thoughtful festive, wedding and housewarming gifting.",
    "home-accents": "Selected by the Decorbeats team for proportion, material presence and its place in a considered home."
  };
  return notes[collectionId] ?? notes["home-accents"];
}

function pushCustomerPath(path) {
  if (typeof window === "undefined") {
    return;
  }
  window.history.pushState({}, "", `${path}${window.location.search}`);
}

function getCustomerProductStory(product) {
  const note = safeText(product?.notes);
  if (!note || note.toLowerCase() === safeText(product?.name).toLowerCase()) {
    return "";
  }

  const internalNotePattern =
    /\b(qc|quality check|requires? review|pending|internal|inventory|stock|cost|photo|image|amazon|listing)\b/i;
  return internalNotePattern.test(note) ? "" : note;
}

function normalizeUrl(value) {
  const url = safeText(value);
  if (!url || url === "[URL]") {
    return "";
  }
  return url;
}

function getOptimizedImageUrl(value, width = 720, quality = 72, resize = "cover") {
  const url = normalizeUrl(value);
  if (!url || !url.includes(".supabase.co/storage/v1/object/public/")) {
    return url;
  }

  try {
    const optimizedUrl = new URL(
      url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")
    );
    optimizedUrl.searchParams.set("width", String(width));
    optimizedUrl.searchParams.set("quality", String(quality));
    optimizedUrl.searchParams.set("resize", resize);
    return optimizedUrl.toString();
  } catch (_error) {
    return url;
  }
}

function getOptimizedImageSrcSet(value, widths, quality = 72, resize = "cover") {
  const url = normalizeUrl(value);
  if (!url || !url.includes(".supabase.co/storage/v1/object/public/")) {
    return undefined;
  }

  return widths
    .map((width) => `${getOptimizedImageUrl(url, width, quality, resize)} ${width}w`)
    .join(", ");
}

function normalizeImageUrls(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeUrl).filter(Boolean);
  }
  if (typeof value === "string") {
    const normalized = normalizeUrl(value);
    return normalized ? [normalized] : [];
  }
  return [];
}

function normalizeVideoUrls(value) {
  return normalizeImageUrls(value);
}

function sanitizeStorageSegment(value, fallback = "draft") {
  const cleaned = safeText(value)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

function getFileExtension(fileName) {
  const extension = safeText(fileName).split(".").pop()?.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return extension || "jpg";
}

function buildProductImagePath(sku, fileName) {
  return `${sanitizeStorageSegment(sku)}/${Date.now()}.${getFileExtension(fileName)}`;
}

function buildProductVideoPath(sku, fileName) {
  return `${sanitizeStorageSegment(sku)}/videos/${Date.now()}.${getFileExtension(fileName)}`;
}

function buildPurchaseReferenceImagePath(vendorName, fileName) {
  return `purchases/${sanitizeStorageSegment(vendorName, "vendor")}/${Date.now()}.${getFileExtension(fileName)}`;
}

function buildHeroSlideImagePath(fileName) {
  return `hero-slides/${Date.now()}.${getFileExtension(fileName)}`;
}

function getNextSku(products, material, category) {
  const materialCode = materialSkuCodes[material] || "OT";
  const categoryCode = categorySkuCodes[category] || "MISC";
  const prefix = `DB-${materialCode}-${categoryCode}-`;
  const nextNumber =
    products.reduce((highest, product) => {
      if (!safeText(product.sku).startsWith(prefix)) {
        return highest;
      }
      const parsed = Number.parseInt(product.sku.slice(prefix.length), 10);
      return Number.isNaN(parsed) ? highest : Math.max(highest, parsed);
    }, 0) + 1;
  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

function getProductImages(product) {
  const urls = normalizeImageUrls(product?.imageUrls);
  if (urls.length) {
    return urls;
  }
  const fallback = normalizeUrl(product?.imageUrl);
  return fallback ? [fallback] : [];
}

function getProductVideos(product) {
  return normalizeVideoUrls(product?.videoUrls);
}

function getPrimaryImage(product) {
  return getProductImages(product)[0] ?? "";
}

function normalizeProductMatch(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findOccasionImageProduct(products, occasion) {
  const preferredNames = (occasion.preferredImageProducts ?? [])
    .map(normalizeProductMatch)
    .filter(Boolean);

  if (preferredNames.length) {
    const preferredProduct = products.find((entry) => {
      const productName = normalizeProductMatch(entry.name);
      return (
        getPrimaryImage(entry) &&
        preferredNames.some((name) => productName === name || productName.includes(name) || name.includes(productName))
      );
    });

    if (preferredProduct) {
      return preferredProduct;
    }
  }

  return products.find((entry) => entry.category === occasion.category && getPrimaryImage(entry));
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function formatCurrency(value) {
  if (value == null || value === "") {
    return "Not set";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function parsePrice(value) {
  if (!hasDisplayValue(value)) {
    return null;
  }
  const parsed = Number(String(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasDisplayValue(value) {
  if (value == null) {
    return false;
  }
  const normalized = String(value).trim();
  if (normalized === "" || normalized === "Not set") {
    return false;
  }
  const parsed = Number(normalized.replace(/,/g, ""));
  return Number.isNaN(parsed) ? true : parsed !== 0;
}

function loadRazorpayCheckout() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Payments are only available in the browser"));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Could not load Razorpay Checkout")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
    document.body.appendChild(script);
  });
}

function getMarginMeta(mrp, costPrice) {
  if (!hasDisplayValue(mrp) || !hasDisplayValue(costPrice)) {
    return null;
  }

  const mrpValue = Number(mrp);
  const costValue = Number(costPrice);
  if (!Number.isFinite(mrpValue) || !Number.isFinite(costValue) || mrpValue === 0) {
    return null;
  }

  const percent = Math.round(((mrpValue - costValue) / mrpValue) * 100);
  return {
    label: `Margin: ${percent}%`,
    tone: percent > 40 ? "good" : percent >= 20 ? "warn" : "bad"
  };
}

function handleNumericInputClick(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  try {
    input.type = "text";
    input.setSelectionRange(0, input.value.length);
    input.type = "number";
  } catch (_error) {
    input.select?.();
  }
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15 8a3 3 0 1 0-2.82-4H12a3 3 0 0 0 .18 1l-5.1 2.95a3 3 0 1 0 0 8.1l5.1 2.95A3 3 0 1 0 13 18a3 3 0 0 0-.18 1l-5.1-2.95a3 3 0 0 0 0-2.1L12.82 11A3 3 0 0 0 15 12a3 3 0 1 0 0-4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 4.5 7.8 6H5.5A2.5 2.5 0 0 0 3 8.5v9A2.5 2.5 0 0 0 5.5 20h13a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 18.5 6h-2.3L15 4.5H9Zm3 12.2a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4Zm0-1.8a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12.04 3.5a8.47 8.47 0 0 0-7.28 12.8L3.5 20.5l4.33-1.23A8.47 8.47 0 1 0 12.04 3.5Zm0 1.9a6.57 6.57 0 0 1 5.64 9.93l-.18.29.74 2.56-2.63-.7-.28.17a6.57 6.57 0 1 1-3.29-12.15Zm-3.1 3.43c-.17 0-.43.06-.66.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.02 2.59.12.17 1.76 2.82 4.35 3.84 2.14.84 2.6.67 3.06.6.46-.08 1.48-.6 1.69-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29-.25-.12-1.48-.73-1.71-.81-.23-.08-.39-.12-.56.12-.17.25-.65.81-.8.98-.15.17-.29.19-.54.06-.25-.12-1.06-.39-2.03-1.26-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.1-.52.11-.11.25-.29.37-.44.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.47-.4-.4-.56-.4h-.48Z"
        fill="currentColor"
      />
    </svg>
  );
}

function toProduct(raw, index = 0) {
  const quantity = Number(raw.quantity ?? 0);
  const imageUrls = normalizeImageUrls(raw.imageUrls ?? raw.image_urls);
  const videoUrls = normalizeVideoUrls(raw.videoUrls ?? raw.video_urls);
  const primaryImage = imageUrls[0] ?? normalizeUrl(raw.imageUrl ?? raw.image_url);
  return {
    id: raw.id ?? index + 1,
    slug: raw.slug ?? slugify(`${raw.sku}-${raw.name}`),
    sku: raw.sku ?? "",
    name: normalizeProductName(raw.name),
    category: normalizeProductCategory(raw.category),
    material: raw.material ?? "Unspecified",
    quantity,
    stockStatus: quantity <= 0 ? "Out of stock" : quantity <= 10 ? "Low stock" : "In stock",
    driveUrl: raw.driveUrl ?? raw.drive_url ?? "",
    imageUrl: primaryImage,
    imageUrls,
    videoUrls,
    size: safeText(raw.size),
    weight: safeText(raw.weight),
    notes: raw.notes ?? "",
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    archivedAt: raw.archivedAt ?? raw.archived_at ?? null,
    pinned: Boolean(raw.pinned),
    marketingTag: safeText(raw.marketingTag ?? raw.marketing_tag),
    pricing: {
      unitCost: raw.pricing?.unitCost ?? raw.cost_price ?? raw.unit_cost ?? null,
      costPrice: raw.pricing?.costPrice ?? raw.cost_price ?? raw.unit_cost ?? null,
      mrp: raw.pricing?.mrp ?? raw.mrp ?? null,
      b2b: raw.pricing?.b2b ?? raw.b2b_price ?? null
    }
  };
}

function toHeroSlide(raw, index = 0) {
  const rawImageUrl = normalizeUrl(raw.image_url ?? raw.imageUrl);
  const isLegacyLeadSlide =
    rawImageUrl === "/assets/images/slider-credibility-studio.svg" ||
    rawImageUrl.includes("/hero-slides/1778733194643.jpg");
  const isVaralakshmiCampaignSlide = rawImageUrl.includes("/hero-slides/1778948763595.jpg");
  const isLegacyPosterSlide = rawImageUrl.includes("/hero-slides/1778697872686.jpg");
  const campaignSlide = isVaralakshmiCampaignSlide
    ? defaultHeroSlides[0]
    : isLegacyLeadSlide
      ? defaultHeroSlides[1]
      : null;
  const imageUrl = campaignSlide?.imageUrl || rawImageUrl;
  return {
    id: raw.id ?? `hero-slide-${index}`,
    eyebrow: campaignSlide
      ? campaignSlide.eyebrow
      : safeText(raw.eyebrow, "Decorbeats"),
    title: campaignSlide
      ? campaignSlide.title
      : safeText(raw.title, "Handcrafted for every celebration."),
    body: campaignSlide
      ? campaignSlide.body
      : safeText(raw.body, "Brass, metal & artisanal decor - made in India, gifted with rhythm."),
    ctaLabel: campaignSlide
      ? campaignSlide.ctaLabel
      : safeText(raw.cta_label ?? raw.ctaLabel, "Shop the Collection"),
    ctaAction: campaignSlide
      ? campaignSlide.ctaAction
      : safeText(raw.cta_action ?? raw.ctaAction, "collection"),
    collectionId: campaignSlide?.collectionId ?? resolveCustomerCollectionId(raw.collection_id ?? raw.collectionId) ?? "all",
    contentPosition: safeText(raw.content_position ?? raw.contentPosition, "left"),
    imageUrl,
    mobileImageUrl: campaignSlide?.mobileImageUrl ?? normalizeUrl(raw.mobile_image_url ?? raw.mobileImageUrl),
    posterOnly: Boolean(raw.poster_only ?? raw.posterOnly ?? isLegacyPosterSlide),
    active: raw.active ?? raw.is_active ?? true,
    sortOrder: isVaralakshmiCampaignSlide
      ? 0
      : Number(raw.sort_order ?? raw.sortOrder ?? index + 1),
    createdAt: raw.created_at ?? raw.createdAt ?? null
  };
}

function createEmptyHeroSlideForm() {
  return {
    eyebrow: "Decorbeats",
    title: "",
    body: "",
    ctaLabel: "Shop the Collection",
    ctaAction: "collection",
    contentPosition: "left",
    imageUrl: "",
    sortOrder: ""
  };
}

function getHeroTitleLines(title) {
  const cleanTitle = safeText(title, defaultHeroSlides[0].title);
  if (cleanTitle.includes("|")) {
    return cleanTitle.split("|").map((part) => part.trim()).filter(Boolean);
  }
  if (cleanTitle.includes("\n")) {
    return cleanTitle.split("\n").map((part) => part.trim()).filter(Boolean);
  }
  return [cleanTitle];
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function normalizeCsvKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getCsvValue(row, ...keys) {
  const entries = Object.entries(row);
  for (const key of keys) {
    const match = entries.find(([header]) => normalizeCsvKey(header) === key);
    if (match) {
      return match[1];
    }
  }
  return "";
}

function mapCsvRowToPayload(row) {
  const sku = safeText(row.SKU);
  const name = safeText(row["Product Name"]);
  if (!sku || !name) {
    return null;
  }

  return {
    sku,
    slug: slugify(`${sku}-${name}`),
    name,
    category: safeText(row.Category, "Uncategorized"),
    material: safeText(row.Material, "Unspecified"),
    quantity: Math.trunc(parseNumber(row.Quantity) ?? 0),
    cost_price: parseNumber(row["Cost Price"] ?? row["Cost Price (your cost)"] ?? row["Cost"] ?? row.cost_price),
    unit_cost: parseNumber(row["Unit Cost"]),
    mrp: parseNumber(row.MRP),
    b2b_price: parseNumber(row["B2B Price"]),
    size: safeText(row.Size ?? row.size),
    weight: safeText(row.Weight ?? row.weight),
    marketing_tag: safeText(row["Marketing Tag"] ?? row.marketing_tag),
    notes: safeText(row.Notes),
    drive_url: normalizeUrl(row["Column 1"]),
    image_url: normalizeUrl(row["Product Image URL"])
  };
}

function mapSettingsCsvRowToPayload(row) {
  const sku = safeText(getCsvValue(row, "sku"));
  const name = safeText(getCsvValue(row, "name", "product_name"));
  if (!sku || !name) {
    return null;
  }

  return {
    sku,
    slug: slugify(`${sku}-${name}`),
    name,
    category: safeText(getCsvValue(row, "category"), "Uncategorized"),
    material: safeText(getCsvValue(row, "material"), "Unspecified"),
    quantity: Math.trunc(parseNumber(getCsvValue(row, "stock", "quantity")) ?? 0),
    cost_price: parseNumber(getCsvValue(row, "cost_price", "cost", "unit_cost")),
    mrp: parseNumber(getCsvValue(row, "mrp")),
    b2b_price: parseNumber(getCsvValue(row, "b2b_price", "b2b")),
    size: safeText(getCsvValue(row, "size", "dimensions")),
    weight: safeText(getCsvValue(row, "weight")),
    notes: safeText(getCsvValue(row, "description", "notes"))
  };
}

function dedupePayloadBySku(rows) {
  const uniqueBySku = new Map();
  let duplicates = 0;

  rows.forEach((row) => {
    if (uniqueBySku.has(row.sku)) {
      duplicates += 1;
    }
    uniqueBySku.set(row.sku, row);
  });

  return {
    rows: Array.from(uniqueBySku.values()),
    duplicates
  };
}

function ProductImage({ product, compact = false }) {
  const primaryImage = getPrimaryImage(product);
  if (primaryImage) {
    return (
      <div className={`product-image-shell ${compact ? "compact" : ""}`}>
        <img className="product-image" src={primaryImage} alt={product.name} loading="lazy" />
      </div>
    );
  }

  return (
    <div className={`product-image-shell product-image-fallback ${compact ? "compact" : ""}`}>
      <img src={brandLogo} alt="Decorbeats" className="product-placeholder-logo" loading="lazy" />
      <strong>{product?.name ?? "Decorbeats"}</strong>
      <small>{product?.driveUrl ? "Drive folder linked" : "Image coming soon"}</small>
    </div>
  );
}

function ProductThumb({ product }) {
  const primaryImage = getPrimaryImage(product);
  if (primaryImage) {
    return (
      <div className="product-thumb">
        <img className="product-thumb-image" src={primaryImage} alt={product.name} loading="lazy" />
      </div>
    );
  }

  return (
    <div className="product-thumb product-thumb-fallback">
      <img src={brandLogo} alt="Decorbeats" className="product-thumb-logo" loading="lazy" />
    </div>
  );
}

function LandingView({ onAdmin, onCustomer }) {
  return (
    <section className="landing-shell">
      <div className="landing-card">
        <img src={brandLogo} alt="Decorbeats" className="landing-logo" />
        <h1>Welcome to the World of Gifting</h1>
        <p className="landing-tagline">Inventory, product sharing, and gifting collections in one clean mobile workspace.</p>
        <div className="landing-actions">
          <button type="button" className="primary-button" onClick={onAdmin}>
            Admin
          </button>
          <button type="button" className="ghost-button" onClick={onCustomer}>
            Customer
          </button>
        </div>
      </div>
    </section>
  );
}

function ScreenHeader({ eyebrow, title, subtitle, action }) {
  return (
    <header className="screen-header">
      <div className="brand-lockup compact-lockup">
        <img src={brandLogo} alt="Decorbeats" className="brand-logo small" />
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {subtitle ? <p className="screen-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="screen-header-action">{action}</div> : null}
    </header>
  );
}

function StatusStrip({ statusMessage, items = [] }) {
  return (
    <section className="status-strip panel-card">
      <p className="status-copy">{statusMessage}</p>
      {items.length ? (
        <div className="mini-stats">
          {items.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StatStrip({ items }) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="stat-strip" aria-label="Inventory highlights">
      {items.map((item) => (
        <article
          key={item.label}
          className={
            item.emphasis ? `stat-chip emphasis${item.tone ? ` ${item.tone}` : ""}` : "stat-chip"
          }
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}

function ControlBar({ search, setSearch, categoryFilter, setCategoryFilter, categories }) {
  return (
    <section className="panel-card control-bar">
      <input
        className="search-input"
        type="search"
        placeholder="Search by product, SKU, material, or category"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="filter-pills">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={category === categoryFilter ? "filter-pill active" : "filter-pill"}
            onClick={() => setCategoryFilter(category)}
          >
            {category}
          </button>
        ))}
      </div>
    </section>
  );
}

function AuthPanel({ email, setEmail, password, setPassword, authBusy, userEmail, onSignIn, onSignOut }) {
  return (
    <section className="panel-card admin-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Admin Access</p>
          <h3>{userEmail ? "Studio access unlocked" : "Sign in to manage inventory"}</h3>
        </div>
        {userEmail ? (
          <button type="button" className="ghost-button" onClick={onSignOut}>
            Sign out
          </button>
        ) : null}
      </div>
      {userEmail ? (
        <p className="support-copy">You can now add products, update stock, archive items, and upload images.</p>
      ) : (
        <div className="auth-row">
          <input
            className="search-input"
            type="email"
            placeholder="admin-email@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="search-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="button" className="primary-button" disabled={authBusy} onClick={onSignIn}>
            {authBusy ? "Signing in..." : "Sign In"}
          </button>
        </div>
      )}
    </section>
  );
}

function ImportPanel({ importBusy, previewRows, previewFileName, previewCount, onFileChange, onConfirm, onClearPreview }) {
  return (
    <section className="panel-card admin-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">CSV Import</p>
          <h3>Import Products from CSV</h3>
        </div>
      </div>
      <p className="support-copy">
        Upload a CSV with columns for `sku`, `name`, `category`, `material`, `mrp`, `stock`, `b2b_price`, and
        `description`.
      </p>
      <label className="import-dropzone">
        <strong>{importBusy ? "Preparing import..." : "Tap to upload CSV"}</strong>
        <span>We’ll preview the first 5 rows before anything is imported.</span>
        <input type="file" accept=".csv,text/csv" onChange={onFileChange} disabled={importBusy} />
      </label>
      {previewRows.length ? (
        <div className="import-preview">
          <div className="section-head">
            <div>
              <p className="eyebrow">Preview</p>
              <h3>{previewFileName}</h3>
            </div>
            <div className="user-badge">{previewCount} row(s) ready</div>
          </div>
          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Material</th>
                  <th>MRP</th>
                  <th>Stock</th>
                  <th>B2B</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={`${row.sku}-${index}`}>
                    <td>{row.sku}</td>
                    <td>{row.name}</td>
                    <td>{row.category}</td>
                    <td>{row.material}</td>
                    <td>{row.mrp ?? "-"}</td>
                    <td>{row.quantity}</td>
                    <td>{row.b2b_price ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="detail-edit-actions">
            <button type="button" className="primary-button detail-save-button" disabled={importBusy} onClick={onConfirm}>
              {importBusy ? "Importing..." : "Confirm Import"}
            </button>
            <button type="button" className="detail-cancel-link" onClick={onClearPreview}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function HeroSlideSettingsPanel({
  slides,
  form,
  setForm,
  busy,
  error,
  uploadStageMessage,
  compressionMessage,
  onImageChange,
  onSubmit,
  onDelete,
  onMove
}) {
  const sortedSlides = [...slides].sort((left, right) => left.sortOrder - right.sortOrder);

  return (
    <section className="panel-card admin-card settings-card hero-slide-settings">
      <div className="section-head">
        <div>
          <p className="eyebrow">Storefront</p>
          <h3>Credibility Slider</h3>
        </div>
      </div>
      <p className="support-copy">
        Add trust-building hero slides for the customer page. Use this for experience center photos, GST credibility,
        brand stories, exhibitions, or corporate gifting proof.
      </p>
      <form className="form-grid hero-slide-form" onSubmit={onSubmit}>
        <label className="product-photo-dropzone hero-slide-dropzone">
          {form.imageUrl ? <img src={form.imageUrl} alt="" className="product-photo-preview" /> : <CameraIcon />}
          {!form.imageUrl ? (
            <>
              <strong>{busy ? "Working..." : "Tap to upload slider image"}</strong>
              <span>Wide lifestyle images work best. We’ll optimise it before upload.</span>
            </>
          ) : (
            <span className="hero-slide-preview-badge">Tap to replace image</span>
          )}
          <input type="file" accept="image/*,.heic,.heif" onChange={onImageChange} disabled={busy} />
        </label>
        {uploadStageMessage ? <p className="compression-note">{uploadStageMessage}</p> : null}
        {compressionMessage ? <p className="compression-note">{compressionMessage}</p> : null}
        <label>
          Eyebrow
          <input
            type="text"
            value={form.eyebrow}
            placeholder="e.g. Bengaluru Experience Center"
            onChange={(event) => setForm((current) => ({ ...current, eyebrow: event.target.value }))}
          />
        </label>
        <label>
          Headline
          <input
            type="text"
            value={form.title}
            placeholder="e.g. Visit our gifting studio in Bengaluru"
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
        </label>
        <label>
          Supporting copy
          <textarea
            rows="3"
            value={form.body}
            placeholder="Add one short credibility-building line."
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
          />
        </label>
        <div className="form-grid hero-slide-inline">
          <label>
            Button text
            <input
              type="text"
              value={form.ctaLabel}
              onChange={(event) => setForm((current) => ({ ...current, ctaLabel: event.target.value }))}
            />
          </label>
          <label>
            Button action
            <select value={form.ctaAction} onChange={(event) => setForm((current) => ({ ...current, ctaAction: event.target.value }))}>
              <option value="collection">Scroll to collection</option>
              <option value="whatsapp">Open WhatsApp</option>
            </select>
          </label>
          <label>
            Text position
            <select
              value={form.contentPosition}
              onChange={(event) => setForm((current) => ({ ...current, contentPosition: event.target.value }))}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label>
            Order
            <input
              type="number"
              inputMode="numeric"
              value={form.sortOrder}
              placeholder={`${slides.length + 1}`}
              onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
            />
          </label>
        </div>
        {error ? (
          <div className="inline-upload-error">
            <p>{error}</p>
            {error.includes("table is missing") ? (
              <pre>{`create table if not exists hero_slides (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp default now(),
  eyebrow text,
  title text not null,
  body text,
  cta_label text default 'Shop the Collection',
  cta_action text default 'collection',
  content_position text default 'left',
  image_url text,
  sort_order integer default 1,
  is_active boolean default true
);

alter table hero_slides enable row level security;

create policy "Public can read active hero slides"
on hero_slides for select using (is_active = true);

create policy "Authenticated users can manage hero slides"
on hero_slides for all to authenticated using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from hero_slides where image_url = '/assets/images/decorbeats-atelier-campaign.jpg'
  ) then
    update hero_slides
    set sort_order = coalesce(sort_order, 1) + 1
    where is_active = true;

    insert into hero_slides (
      eyebrow, title, body, cta_label, cta_action, content_position, image_url, sort_order, is_active
    )
    values (
      'Decorbeats Trust',
      'See the craft|gift with confidence.',
      'Bengaluru experience center, GST presence across KA, TN & MH, and bulk gifting support from 50 to 400+ units.',
      'Enquire on WhatsApp',
      'whatsapp',
      'left',
      '/assets/images/decorbeats-atelier-campaign.jpg',
      1,
      true
    );
  end if;
end $$;`}</pre>
            ) : null}
          </div>
        ) : null}
        <button type="submit" className="primary-button product-submit-button" disabled={busy}>
          {busy ? "Saving..." : "Add Slide"}
        </button>
      </form>
      {slides.length ? (
        <div className="hero-slide-list">
          {sortedSlides.map((slide, index) => (
            <article key={slide.id} className="hero-slide-list-item">
              {slide.imageUrl ? <img src={slide.imageUrl} alt="" /> : <div className="hero-slide-list-placeholder">𝄞</div>}
              <div>
                <p className="eyebrow">{slide.eyebrow}</p>
                <strong>{slide.title}</strong>
                <span>{slide.contentPosition} · order {slide.sortOrder}</span>
              </div>
              <div className="hero-slide-actions">
                <button
                  type="button"
                  className="secondary-button hero-slide-move-button"
                  disabled={busy || index === 0}
                  onClick={() => onMove(slide.id, "up")}
                >
                  Move Up
                </button>
                <button
                  type="button"
                  className="secondary-button hero-slide-move-button"
                  disabled={busy || index === sortedSlides.length - 1}
                  onClick={() => onMove(slide.id, "down")}
                >
                  Move Down
                </button>
                <button type="button" className="detail-cancel-link" disabled={busy} onClick={() => onDelete(slide.id)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="support-copy">No custom slides yet. The storefront is using the default hero until you add one.</p>
      )}
    </section>
  );
}

function AccountCard({ userEmail, onSignOut }) {
  return (
    <section className="panel-card admin-card settings-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Account</p>
          <h3>Signed-in admin</h3>
        </div>
      </div>
      <p className="support-copy">{userEmail || "No signed-in email"}</p>
      <button type="button" className="ghost-button settings-button" onClick={onSignOut}>
        Sign out
      </button>
    </section>
  );
}

function AppInfoCard({ lastSyncLabel }) {
  return (
    <section className="panel-card admin-card settings-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">App Info</p>
          <h3>Decorbeats Studio</h3>
        </div>
      </div>
      <p className="support-copy">Last sync: {lastSyncLabel}</p>
    </section>
  );
}

function ShareCataloguesScreen({
  catalogues,
  onCreate,
  onCopyLink,
  onOpenLink,
  onArchive,
  busy
}) {
  return (
    <section className="stack-grid catalogue-admin-stack">
      <StatusStrip
        statusMessage="Create a curated catalogue link for a customer with only the products you want to show."
        items={[
          { label: "Active catalogues", value: catalogues.filter((catalogue) => catalogue.status === "active").length },
          { label: "Shared products", value: catalogues.reduce((sum, catalogue) => sum + catalogue.items.length, 0) }
        ]}
      />
      <button type="button" className="primary-button quick-add-button" onClick={onCreate}>
        Create Customer Catalogue
      </button>
      <section className="catalogue-share-list">
        {catalogues.length ? (
          catalogues.map((catalogue) => (
            <article key={catalogue.id} className="catalogue-share-card">
              <div className="catalogue-share-card-main">
                <div>
                  <p className="eyebrow">{catalogue.customerName || "Customer catalogue"}</p>
                  <h3>{catalogue.title}</h3>
                  <p>
                    {catalogue.items.length} product{catalogue.items.length === 1 ? "" : "s"}
                    {catalogue.occasion ? ` · ${catalogue.occasion}` : ""}
                  </p>
                </div>
                <span className={`catalogue-status ${catalogue.status}`}>{catalogue.status}</span>
              </div>
              <ul className="catalogue-share-items">
                {catalogue.items.slice(0, 3).map((item) => (
                  <li key={item.id || item.client_id}>
                    <span>{item.productName}</span>
                    <strong>{item.displayQuantity ? `${item.displayQuantity} pcs` : item.leadTime}</strong>
                  </li>
                ))}
              </ul>
              <div className="catalogue-share-actions">
                <button type="button" className="ghost-button compact-button" onClick={() => onCopyLink(catalogue)}>
                  Copy Link
                </button>
                <button type="button" className="secondary-button compact-button" onClick={() => onOpenLink(catalogue)}>
                  Open
                </button>
                {catalogue.status === "active" ? (
                  <button
                    type="button"
                    className="detail-cancel-link"
                    disabled={busy}
                    onClick={() => onArchive(catalogue)}
                  >
                    Archive
                  </button>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <section className="panel-card admin-card settings-card">
            <p className="eyebrow">No catalogues yet</p>
            <h3>Create the first curated link</h3>
            <p className="support-copy">
              Add products, set the quantity you want to show, mention lead time, then share one simple link on WhatsApp.
            </p>
          </section>
        )}
      </section>
    </section>
  );
}

function CatalogueBuilderModal({
  open,
  draft,
  setDraft,
  products,
  productSearch,
  setProductSearch,
  pickerOpen,
  setPickerOpen,
  onAddProduct,
  onRemoveProduct,
  onUpdateItem,
  onSave,
  onCancel,
  busy,
  error
}) {
  if (!open) {
    return null;
  }

  const selectedSkus = new Set(draft.items.map((item) => item.product_sku).filter(Boolean));
  const searchableProducts = products
    .filter((product) => !product.archivedAt)
    .filter((product) => {
      const haystack = [product.name, product.sku, product.category, product.material].join(" ").toLowerCase();
      return haystack.includes(productSearch.toLowerCase());
    })
    .sort((first, second) => {
      if (selectedSkus.has(first.sku) !== selectedSkus.has(second.sku)) {
        return selectedSkus.has(first.sku) ? 1 : -1;
      }
      return Number(second.quantity || 0) - Number(first.quantity || 0);
    });

  return (
    <div className="inquiry-modal-overlay catalogue-modal-overlay">
      <section className="inquiry-modal catalogue-modal" role="dialog" aria-modal="true" aria-label="Create catalogue">
        <ScreenHeader
          eyebrow="Curated catalogue"
          title="Share selected products"
          subtitle="Build a clean customer link with price, availability and lead time."
          action={
            <button type="button" className="ghost-button" onClick={onCancel}>
              Close
            </button>
          }
        />
        <div className="inquiry-modal-body">
          {error ? <div className="inline-upload-error">{error}</div> : null}
          <div className="form-grid catalogue-builder-grid">
            <label className="span-2">
              Catalogue title
              <input
                value={draft.title}
                placeholder="e.g. Diwali gifting options for Priya"
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label>
              Customer name
              <input
                value={draft.customer_name}
                placeholder="Optional"
                onChange={(event) => setDraft((current) => ({ ...current, customer_name: event.target.value }))}
              />
            </label>
            <label>
              Occasion
              <input
                value={draft.occasion}
                placeholder="Diwali, wedding, corporate gifting..."
                onChange={(event) => setDraft((current) => ({ ...current, occasion: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Note for customer
              <textarea
                rows="3"
                value={draft.intro_note}
                placeholder="Add one warm note explaining this curated selection."
                onChange={(event) => setDraft((current) => ({ ...current, intro_note: event.target.value }))}
              />
            </label>
          </div>

          <section className="catalogue-picker-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Products</p>
                <h3>Choose products</h3>
                <p className="support-copy compact-copy">
                  {draft.items.length ? `${draft.items.length} selected. Tap a product again to add one more.` : "Search or scroll, then tap products to add them."}
                </p>
              </div>
            </div>
            <div className="sale-picker catalogue-product-picker">
              <input
                className="search-input"
                type="search"
                placeholder="Search all products by name, SKU or category"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
              <div className="catalogue-picker-count">
                Showing {searchableProducts.length} product{searchableProducts.length === 1 ? "" : "s"}
              </div>
              <div className="sale-picker-results catalogue-picker-results">
                {searchableProducts.length ? (
                  searchableProducts.map((product) => {
                    const selected = selectedSkus.has(product.sku);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        className={`sale-picker-item catalogue-picker-item ${selected ? "selected" : ""}`}
                        onClick={() => onAddProduct(product)}
                      >
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            {product.sku} · {product.category || "No category"} · {product.quantity} in stock
                          </small>
                        </span>
                        <span className="catalogue-picker-price">
                          {product.pricing.mrp ? formatCurrency(product.pricing.mrp) : "Price not set"}
                          <small>{selected ? "Selected" : "Tap to add"}</small>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="support-copy">No products match this search.</p>
                )}
              </div>
            </div>

            <div className="section-head selected-catalogue-head">
              <div>
                <p className="eyebrow">Customer catalogue</p>
                <h3>Review selected items</h3>
              </div>
            </div>

            <div className="catalogue-item-editor-list">
              {draft.items.length ? (
                draft.items.map((item, index) => (
                  <article key={item.client_id || item.id || `${item.product_sku}-${index}`} className="catalogue-item-editor-card">
                    <div className="sale-item-head">
                      <div>
                        <strong>{item.product_name || "Selected product"}</strong>
                        <span>{item.product_sku || "Manual item"}</span>
                      </div>
                      <button type="button" className="detail-cancel-link" onClick={() => onRemoveProduct(index)}>
                        Remove
                      </button>
                    </div>
                    <div className="form-grid catalogue-item-fields">
                      <label>
                        Show quantity
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="How many to show?"
                          value={item.display_quantity}
                          onClick={handleNumericInputClick}
                          onChange={(event) => onUpdateItem(index, "display_quantity", event.target.value)}
                        />
                      </label>
                      <label>
                        Customer price
                        <div className="rupee-field">
                          <span>₹</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Optional"
                            value={item.display_price}
                            onClick={handleNumericInputClick}
                            onChange={(event) => onUpdateItem(index, "display_price", event.target.value)}
                          />
                        </div>
                      </label>
                      <label>
                        Lead time
                        <select value={item.lead_time} onChange={(event) => onUpdateItem(index, "lead_time", event.target.value)}>
                          {catalogueLeadTimeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Customer note
                        <input
                          value={item.customer_note}
                          placeholder="e.g. Best for premium gifting"
                          onChange={(event) => onUpdateItem(index, "customer_note", event.target.value)}
                        />
                      </label>
                    </div>
                  </article>
                ))
              ) : (
                <p className="support-copy">No products selected yet. Add products to build the shareable catalogue.</p>
              )}
            </div>
          </section>

          <button type="button" className="primary-button product-submit-button" disabled={busy} onClick={onSave}>
            {busy ? "Creating catalogue..." : "Create & Copy Link"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ShareCataloguePage({ catalogue, products, status, error, onHome }) {
  if (status === "loading") {
    return (
      <div className="catalogue-public-page">
        <div className="catalogue-public-loader">
          <div className="spinner-ring" />
          <p>Loading catalogue...</p>
        </div>
      </div>
    );
  }

  if (error || !catalogue) {
    return (
      <div className="catalogue-public-page">
        <header className="catalogue-public-header">
          <button type="button" className="catalogue-logo-button" onClick={onHome}>
            <img src={brandLogo} alt="Decorbeats" />
          </button>
        </header>
        <section className="catalogue-public-empty">
          <p className="eyebrow">Decorbeats catalogue</p>
          <h1>This catalogue link is not available.</h1>
          <p>{error || "It may have expired or been archived."}</p>
          <button type="button" className="primary-button" onClick={onHome}>
            Visit Decorbeats
          </button>
        </section>
      </div>
    );
  }

  const totalItems = catalogue.items.reduce((sum, item) => sum + Number(item.displayQuantity || 0), 0);
  const shareUrl = buildShareCatalogueUrl(catalogue.slug);
  const whatsappMessage = `${getCatalogueShareMessage(catalogue)}\n\nCatalogue link: ${shareUrl}`;

  return (
    <div className="catalogue-public-page">
      <header className="catalogue-public-header">
        <button type="button" className="catalogue-logo-button" onClick={onHome}>
          <img src={brandLogo} alt="Decorbeats" />
        </button>
        <a className="catalogue-public-whatsapp" href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer">
          Discuss on WhatsApp
        </a>
      </header>
      <main className="catalogue-public-main">
        <section className="catalogue-public-hero">
          <p className="eyebrow">Decorbeats curated catalogue</p>
          <h1>{catalogue.title}</h1>
          {catalogue.introNote ? <p>{catalogue.introNote}</p> : null}
          <div className="catalogue-public-stats">
            <span>{catalogue.items.length} styles</span>
            {totalItems ? <span>{totalItems} units shown</span> : null}
            {catalogue.occasion ? <span>{catalogue.occasion}</span> : null}
          </div>
        </section>
        <section className="catalogue-public-grid">
          {catalogue.items.map((item) => {
            const product = getCatalogueProduct(item, products);
            const imageUrl = product ? getPrimaryImage(product) : "";
            return (
              <article key={item.id || item.productSku} className="catalogue-public-card">
                <div className="catalogue-public-image">
                  {imageUrl ? (
                    <img src={imageUrl} alt={item.productName || product?.name || "Decorbeats product"} loading="lazy" />
                  ) : (
                    <div className="catalogue-public-placeholder">
                      <img src={brandLogo} alt="" />
                    </div>
                  )}
                </div>
                <div className="catalogue-public-copy">
                  <span>{item.productSku || product?.sku}</span>
                  <h2>{item.productName || product?.name}</h2>
                  <p>
                    {product?.category || "Decor"}{product?.material ? ` · ${product.material}` : ""}
                  </p>
                  <div className="catalogue-public-badges">
                    {item.displayQuantity != null ? <strong>{item.displayQuantity} available</strong> : null}
                    {item.leadTime ? <strong>{item.leadTime}</strong> : null}
                  </div>
                  {item.displayPrice ? <div className="catalogue-public-price">{formatCurrency(item.displayPrice)}</div> : null}
                  {item.customerNote ? <p className="catalogue-public-note">{item.customerNote}</p> : null}
                </div>
              </article>
            );
          })}
        </section>
        <section className="catalogue-public-cta">
          <h2>Want to shortlist these?</h2>
          <p>Send this catalogue to Megha on WhatsApp and she’ll help with availability, packing and delivery.</p>
          <a className="whatsapp-btn" href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer">
            <WhatsAppIcon /> Discuss this catalogue
          </a>
        </section>
      </main>
    </div>
  );
}

function InquiryStatusFilters({ activeStatus, onChange }) {
  const filters = ["all", ...inquiryStatusOrder];

  return (
    <div className="inquiry-status-row" aria-label="Filter inquiries by status">
      {filters.map((status) => (
        <button
          key={status}
          type="button"
          className={activeStatus === status ? "inquiry-status-pill active" : "inquiry-status-pill"}
          onClick={() => onChange(status)}
        >
          {status === "all" ? "All" : formatInquiryStatus(status)}
        </button>
      ))}
    </div>
  );
}

function InquiryCard({ inquiry, expanded, onToggle, onStatusUpdate, busy }) {
  const requestedUnits = inquiry.items.reduce((sum, item) => sum + Number(item.quantityRequested || 0), 0);
  const productsMentioned = inquiry.items.map((item) => item.productName || item.productSku).filter(Boolean).join(", ");
  const nextStatus = inquiryStatusOrder[inquiryStatusOrder.indexOf(inquiry.status) + 1] ?? null;

  return (
    <article className={expanded ? "inquiry-card expanded" : "inquiry-card"}>
      <button type="button" className="inquiry-card-main" onClick={() => onToggle(inquiry.id)}>
        <div className="inquiry-card-top">
          <div>
            <p className="inquiry-customer-name">{inquiry.customerName}</p>
            <p className="inquiry-products-line">{productsMentioned || "No products added yet"}</p>
          </div>
          <span className={`inquiry-status-badge ${inquiry.status}`}>{formatInquiryStatus(inquiry.status)}</span>
        </div>
        <div className="inquiry-card-meta">
          <span>{requestedUnits ? `${requestedUnits} units` : "Quantity not set"}</span>
          {inquiry.occasion ? <span>{inquiry.occasion}</span> : null}
          {inquiry.requiredByDate ? <span>{inquiry.requiredByDate}</span> : null}
        </div>
      </button>

      {expanded ? (
        <div className="inquiry-card-detail">
          <div className="inquiry-detail-grid">
            <div>
              <span>Customer</span>
              <strong>{inquiry.customerName}</strong>
            </div>
            {inquiry.customerPhone ? (
              <div>
                <span>Phone</span>
                <strong>{inquiry.customerPhone}</strong>
              </div>
            ) : null}
            <div>
              <span>Source</span>
              <strong>{inquiry.source}</strong>
            </div>
            {inquiry.occasion ? (
              <div>
                <span>Occasion</span>
                <strong>{inquiry.occasion}</strong>
              </div>
            ) : null}
            {inquiry.requiredByDate ? (
              <div>
                <span>Required by</span>
                <strong>{inquiry.requiredByDate}</strong>
              </div>
            ) : null}
          </div>
          {inquiry.items.length ? (
            <ul className="inquiry-item-list">
              {inquiry.items.map((item) => (
                <li key={item.id || `${item.productSku}-${item.productName}`}>
                  <strong>{item.productName || item.productSku || "Product"}</strong>
                  <span>{item.quantityRequested || 0} requested</span>
                </li>
              ))}
            </ul>
          ) : null}
          {inquiry.notes ? <p className="detail-note">{inquiry.notes}</p> : null}
          <div className="inquiry-card-actions">
            <button
              type="button"
              className="ghost-button"
              disabled={busy || !nextStatus}
              onClick={() => nextStatus && onStatusUpdate(inquiry, nextStatus)}
            >
              {nextStatus ? `Mark as ${formatInquiryStatus(nextStatus)}` : "Status complete"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function InquiriesScreen({
  inquiries,
  statusFilter,
  setStatusFilter,
  expandedInquiryId,
  onToggleInquiry,
  onStatusUpdate,
  onNewInquiry,
  busy
}) {
  return (
    <section className="stack-grid">
      <button type="button" className="primary-button inquiry-log-button" onClick={onNewInquiry}>
        <MicIcon />
        <span>Log New Inquiry</span>
      </button>
      <InquiryStatusFilters activeStatus={statusFilter} onChange={setStatusFilter} />
      <section className="inquiry-list">
        {inquiries.length ? (
          inquiries.map((inquiry) => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              expanded={expandedInquiryId === inquiry.id}
              onToggle={onToggleInquiry}
              onStatusUpdate={onStatusUpdate}
              busy={busy}
            />
          ))
        ) : (
          <div className="panel-card empty-state">
            <p className="eyebrow">No inquiries yet</p>
            <h3>Your customer requests will appear here.</h3>
          </div>
        )}
      </section>
    </section>
  );
}

function SalesSummaryStrip({ items }) {
  return <StatStrip items={items} />;
}

function SalesPaymentFilters({ activeStatus, onChange }) {
  const filters = ["all", "pending", "paid"];

  return (
    <div className="inquiry-status-row" aria-label="Filter sales by payment status">
      {filters.map((status) => (
        <button
          key={status}
          type="button"
          className={activeStatus === status ? "inquiry-status-pill active" : "inquiry-status-pill"}
          onClick={() => onChange(status)}
        >
          {status === "all" ? "All" : formatPaymentStatus(status)}
        </button>
      ))}
    </div>
  );
}

function SaleCard({ sale, expanded, onToggle, onMarkAsPaid, onDeleteSale, markingPaidId, deletingSaleId }) {
  const itemsSummary = sale.items.map((item) => `${item.quantitySold}× ${item.productName || item.productSku}`).join(" + ");
  const badgeClass =
    sale.paymentMethod === "upi" ? "sale-payment-badge upi" : sale.paymentMethod === "cash" ? "sale-payment-badge cash" : "sale-payment-badge";
  const paymentStatusClass = sale.paymentStatus === "pending" ? "sale-payment-status pending" : "sale-payment-status paid";
  const isPending = sale.paymentStatus === "pending";
  const isBusy = markingPaidId === sale.id;
  const isDeleting = deletingSaleId === sale.id;

  return (
    <article className={expanded ? "sale-card expanded" : "sale-card"}>
      <button type="button" className="sale-card-main" onClick={() => onToggle(sale.id)}>
        <div className="sale-card-top">
          <div>
            <p className="sale-card-date">{formatSaleDate(sale.createdAt)}</p>
            <h3>{sale.customerName}</h3>
          </div>
          <div className="sale-card-badges">
            <span className={badgeClass}>{formatPaymentMethod(sale.paymentMethod)}</span>
            <span className={paymentStatusClass}>{isPending ? "₹ PENDING" : "PAID"}</span>
          </div>
        </div>
        <p className="sale-card-items">{itemsSummary || "No items recorded"}</p>
        <div className="sale-card-meta">
          <strong>{formatCurrency(sale.totalAmount)}</strong>
        </div>
      </button>
      {expanded ? (
        <div className="sale-card-detail">
          <div className="sale-detail-grid">
            <div>
              <span>Customer</span>
              <strong>{sale.customerName}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>{formatPaymentMethod(sale.paymentMethod)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{formatPaymentStatus(sale.paymentStatus)}</strong>
            </div>
            <div>
              <span>Time</span>
              <strong>{formatSaleDate(sale.createdAt)}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatCurrency(sale.totalAmount)}</strong>
            </div>
          </div>
          <ul className="sale-item-list">
            {sale.items.map((item) => (
              <li key={item.id || `${item.productSku}-${item.productName}`}>
                <div>
                  <strong>{item.productName || item.productSku}</strong>
                  <span>{item.productSku}</span>
                </div>
                <div>
                  <strong>{item.quantitySold} × {formatCurrency(item.sellingPrice)}</strong>
                </div>
              </li>
            ))}
          </ul>
          {sale.notes ? <p className="detail-note">{sale.notes}</p> : null}
          <div className="sale-card-actions">
            {isPending ? (
              <button
                type="button"
                className="ghost-button"
                disabled={isBusy || isDeleting}
                onClick={() => onMarkAsPaid?.(sale)}
              >
                {isBusy ? "Updating..." : "Mark as Paid"}
              </button>
            ) : null}
            <button
              type="button"
              className="danger-button"
              disabled={isBusy || isDeleting}
              onClick={() => onDeleteSale?.(sale)}
            >
              {isDeleting ? "Deleting..." : "Delete Sale"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function SalesScreen({
  sales,
  summaryItems,
  onRecordSale,
  expandedSaleId,
  onToggleSale,
  paymentFilter,
  setPaymentFilter,
  onMarkAsPaid,
  onDeleteSale,
  markingPaidId,
  deletingSaleId
}) {
  return (
    <section className="stack-grid">
      <button type="button" className="primary-button inquiry-log-button" onClick={onRecordSale}>
        <ReceiptIcon />
        <span>Record Sale</span>
      </button>
      <SalesSummaryStrip items={summaryItems} />
      <SalesPaymentFilters activeStatus={paymentFilter} onChange={setPaymentFilter} />
      <section className="inquiry-list">
        {sales.length ? (
          sales.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale}
              expanded={expandedSaleId === sale.id}
              onToggle={onToggleSale}
              onMarkAsPaid={onMarkAsPaid}
              onDeleteSale={onDeleteSale}
              markingPaidId={markingPaidId}
              deletingSaleId={deletingSaleId}
            />
          ))
        ) : (
          <div className="panel-card empty-state">
            <p className="eyebrow">No sales yet</p>
            <h3>Your recorded sales will appear here.</h3>
          </div>
        )}
      </section>
    </section>
  );
}

function PurchaseSummaryStrip({ items }) {
  return <StatStrip items={items} />;
}

function PurchaseStatusFilters({ activeStatus, onChange }) {
  const filters = ["all", "planned", "ordered", "partially_paid", "in_transit", "received", "cancelled"];

  return (
    <div className="inquiry-status-row" aria-label="Filter purchases by status">
      {filters.map((status) => (
        <button
          key={status}
          type="button"
          className={activeStatus === status ? "inquiry-status-pill active" : "inquiry-status-pill"}
          onClick={() => onChange(status)}
        >
          {status === "all" ? "All" : formatPurchaseStatus(status)}
        </button>
      ))}
    </div>
  );
}

function PurchaseCard({ purchase, expanded, onToggle, onUpdateStatus, updatingStatusId }) {
  const itemsSummary = purchase.items.map((item) => `${item.quantityOrdered}× ${item.productName || item.productSku}`).join(" + ");
  const balance = Number(purchase.balanceDue || 0);
  const badgeClass = `purchase-status-badge ${purchase.status}`;
  const statusBusy = updatingStatusId === purchase.id;

  return (
    <article className={expanded ? "purchase-card expanded" : "purchase-card"}>
      <button type="button" className="purchase-card-main" onClick={() => onToggle(purchase.id)}>
        <div className="purchase-card-top">
          <div>
            <p className="sale-card-date">{formatPurchaseDate(purchase.expectedDeliveryDate || purchase.orderDate)}</p>
            <h3>{purchase.vendorName}</h3>
          </div>
          <span className={badgeClass}>{formatPurchaseStatus(purchase.status)}</span>
        </div>
        <p className="sale-card-items">{itemsSummary || "No items recorded"}</p>
        <div className="purchase-card-meta">
          <strong>{formatCurrency(purchase.totalAmount)}</strong>
          <span>{balance > 0 ? `${formatCurrency(balance)} due` : "Fully paid"}</span>
        </div>
      </button>
      {expanded ? (
        <div className="purchase-card-detail">
          <div className="purchase-card-actions">
            {purchase.status !== "received" ? (
              <button
                type="button"
                className="primary-button compact-button"
                onClick={() => onUpdateStatus(purchase, "received")}
                disabled={statusBusy}
              >
                {statusBusy ? "Saving..." : "Mark as Received"}
              </button>
            ) : null}
            {purchase.status !== "in_transit" && purchase.status !== "received" ? (
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() => onUpdateStatus(purchase, "in_transit")}
                disabled={statusBusy}
              >
                Mark In Transit
              </button>
            ) : null}
            {purchase.status === "received" ? <span className="purchase-status-note">Checked in as received</span> : null}
          </div>
          <div className="sale-detail-grid">
            <div>
              <span>Vendor</span>
              <strong>{purchase.vendorName}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{purchase.vendorPhone || "Not set"}</strong>
            </div>
            <div>
              <span>Ordered</span>
              <strong>{formatPurchaseDate(purchase.orderDate)}</strong>
            </div>
            <div>
              <span>Expected</span>
              <strong>{formatPurchaseDate(purchase.expectedDeliveryDate)}</strong>
            </div>
            <div>
              <span>Paid</span>
              <strong>{formatCurrency(purchase.amountPaid)}</strong>
            </div>
            <div>
              <span>Balance</span>
              <strong>{formatCurrency(purchase.balanceDue)}</strong>
            </div>
          </div>
          {purchase.referenceImageUrl ? (
            <div className="purchase-reference-media">
              <img src={purchase.referenceImageUrl} alt={`${purchase.vendorName} reference`} loading="lazy" />
            </div>
          ) : null}
          <ul className="sale-item-list">
            {purchase.items.map((item) => (
              <li key={item.id || `${item.productSku}-${item.productName}`}>
                <div>
                  <strong>{item.productName || item.productSku}</strong>
                  <span>{item.productSku || "Manual item"}</span>
                </div>
                <div>
                  <strong>
                    {item.costPrice == null
                      ? `${item.quantityOrdered} ordered`
                      : `${item.quantityOrdered} × ${formatCurrency(item.costPrice)}`}
                  </strong>
                </div>
              </li>
            ))}
          </ul>
          {purchase.notes ? <p className="detail-note">{purchase.notes}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

function PurchasesScreen({
  purchases,
  summaryItems,
  onAddPurchase,
  expandedPurchaseId,
  onTogglePurchase,
  statusFilter,
  setStatusFilter,
  onUpdatePurchaseStatus,
  updatingPurchaseStatusId
}) {
  return (
    <section className="stack-grid">
      <button type="button" className="primary-button inquiry-log-button" onClick={onAddPurchase}>
        <BoxIcon />
        <span>Add Purchase</span>
      </button>
      <PurchaseSummaryStrip items={summaryItems} />
      <PurchaseStatusFilters activeStatus={statusFilter} onChange={setStatusFilter} />
      <section className="inquiry-list">
        {purchases.length ? (
          purchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              expanded={expandedPurchaseId === purchase.id}
              onToggle={onTogglePurchase}
              onUpdateStatus={onUpdatePurchaseStatus}
              updatingStatusId={updatingPurchaseStatusId}
            />
          ))
        ) : (
          <div className="panel-card empty-state">
            <p className="eyebrow">No purchases yet</p>
            <h3>Your vendor orders will appear here.</h3>
          </div>
        )}
      </section>
    </section>
  );
}

function RecordPurchaseModal({
  open,
  draft,
  setDraft,
  busy,
  errorMessage,
  compressionMessage,
  uploadStageMessage,
  onReferenceImageChange,
  onClose,
  onAddProduct,
  onRemoveProduct,
  onUpdateItem,
  onSave
}) {
  if (!open) {
    return null;
  }

  const total = Number(draft.total_amount || 0);
  const amountPaid = Number(draft.amount_paid || 0);
  const balanceDue = Math.max(0, total - amountPaid);

  return (
    <div className="inquiry-modal-overlay" onClick={onClose}>
      <div className="inquiry-modal sale-modal" onClick={(event) => event.stopPropagation()}>
        <form
          className="inquiry-modal-body inquiry-confirm-form sale-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <div className="section-head">
            <div>
              <p className="eyebrow">Purchases</p>
              <h3>Add purchase order</h3>
            </div>
          </div>
          {errorMessage ? <p className="inline-upload-error">{errorMessage}</p> : null}
          <label>
            Vendor name
            <input
              value={draft.vendor_name}
              onChange={(event) => setDraft((current) => ({ ...current, vendor_name: event.target.value }))}
              placeholder="Who are you buying from?"
            />
          </label>
          <label>
            Vendor phone
            <input
              value={draft.vendor_phone}
              onChange={(event) => setDraft((current) => ({ ...current, vendor_phone: event.target.value }))}
              placeholder="Phone or WhatsApp number"
            />
          </label>
          <div className="inquiry-inline-fields">
            <label>
              Order date
              <input
                type="date"
                value={draft.order_date}
                onChange={(event) => setDraft((current) => ({ ...current, order_date: event.target.value }))}
              />
            </label>
            <label>
              Tentative delivery
              <input
                type="date"
                value={draft.expected_delivery_date}
                onChange={(event) => setDraft((current) => ({ ...current, expected_delivery_date: event.target.value }))}
              />
            </label>
          </div>
          <label className="product-photo-dropzone">
            <CameraIcon />
            <strong>{busy ? "Uploading..." : "Tap to add reference photo"}</strong>
            <span>{draft.reference_image_url ? "Photo added. Tap again to replace it." : "Optional vendor or product reference image."}</span>
            {draft.reference_image_url ? (
              <img src={draft.reference_image_url} alt="Purchase reference" className="product-photo-preview" />
            ) : null}
            <input type="file" accept="image/*,.heic,.heif" onChange={onReferenceImageChange} disabled={busy} />
          </label>
          {uploadStageMessage ? <p className="compression-note">{uploadStageMessage}</p> : null}
          {compressionMessage ? <p className="compression-note">{compressionMessage}</p> : null}
          <div className="purchase-payment-summary span-2">
            <div className="section-head">
              <div>
                <p className="eyebrow">Payment</p>
                <h3>Total and advance</h3>
              </div>
            </div>
            <div className="inquiry-inline-fields">
              <label>
                Total amount
                <div className="rupee-field">
                  <span>₹</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={Number(draft.total_amount || 0) === 0 ? "" : draft.total_amount}
                    placeholder="Full vendor bill"
                    onClick={handleNumericInputClick}
                    onChange={(event) => setDraft((current) => ({ ...current, total_amount: event.target.value }))}
                  />
                </div>
              </label>
              <label>
                Amount paid
                <div className="rupee-field">
                  <span>₹</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={Number(draft.amount_paid || 0) === 0 ? "" : draft.amount_paid}
                    placeholder="Advance paid"
                    onClick={handleNumericInputClick}
                    onChange={(event) => setDraft((current) => ({ ...current, amount_paid: event.target.value }))}
                  />
                </div>
              </label>
            </div>
            <div className="sale-total-card purchase-balance-card">
              <span>Balance due</span>
              <strong>{formatCurrency(balanceDue)}</strong>
            </div>
          </div>
          <div className="inquiry-products-editor span-2">
            <div className="section-head">
              <div>
                <p className="eyebrow">Products</p>
                <h3>Purchase items</h3>
              </div>
              <button type="button" className="ghost-button" onClick={() => onAddProduct()}>
                Add another
              </button>
            </div>
            <div className="inquiry-product-editor-list">
              {draft.items.length ? (
                draft.items.map((item, index) => (
                  <div key={item.client_id || item.id || `${index}`} className="inquiry-product-editor-card sale-item-card">
                    <div className="sale-item-head">
                      <div>
                        <strong>{item.product_name || `Item ${index + 1}`}</strong>
                        <span>{item.product_sku || "Manual item"}</span>
                      </div>
                      <button type="button" className="detail-cancel-link" onClick={() => onRemoveProduct(index)}>
                        ×
                      </button>
                    </div>
                    <label>
                      Product name
                      <input
                        value={item.product_name}
                        placeholder="What product are you ordering?"
                        onChange={(event) => onUpdateItem(index, "product_name", event.target.value)}
                      />
                    </label>
                    <div className="inquiry-inline-fields">
                      <label>
                        SKU
                        <input
                          value={item.product_sku}
                          placeholder="Optional"
                          onChange={(event) => onUpdateItem(index, "product_sku", event.target.value)}
                        />
                      </label>
                      <label>
                        Quantity
                        <input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={Number(item.quantity_ordered || 0) === 0 ? "" : item.quantity_ordered}
                          placeholder="0"
                          onClick={handleNumericInputClick}
                          onChange={(event) => onUpdateItem(index, "quantity_ordered", event.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                ))
              ) : (
                <p className="support-copy">Add products to track this purchase order.</p>
              )}
            </div>
          </div>
          <label className="span-2">
            Notes
            <textarea
              rows="4"
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="What still needs to be paid, confirmed, or followed up?"
            />
          </label>
          <div className="detail-edit-actions">
            <button type="button" className="primary-button detail-save-button" disabled={busy || !draft.items.length} onClick={onSave}>
              {busy ? "Saving..." : "Save Purchase"}
            </button>
            <button type="button" className="detail-cancel-link" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordSaleModal({
  open,
  draft,
  setDraft,
  products,
  productSearch,
  setProductSearch,
  pickerOpen,
  setPickerOpen,
  busy,
  errorMessage,
  confirmation,
  onCancelConfirmation,
  onConfirmSale,
  onClose,
  onAddProduct,
  onRemoveProduct,
  onUpdateItem,
  onSave
}) {
  if (!open) {
    return null;
  }

  const matchingProducts = products.filter((product) => {
    const query = productSearch.trim().toLowerCase();
    if (!query) {
      return product.quantity > 0;
    }
    return (
      product.quantity > 0 &&
      [product.name, product.sku, product.category, product.material].filter(Boolean).join(" ").toLowerCase().includes(query)
    );
  });

  const total = draft.items.reduce(
    (sum, item) => sum + (Number(item.quantity_sold || 0) * Number(item.selling_price || 0)),
    0
  );

  return (
    <div className="inquiry-modal-overlay" onClick={onClose}>
      <div className="inquiry-modal sale-modal" onClick={(event) => event.stopPropagation()}>
        <form
          className="inquiry-modal-body inquiry-confirm-form sale-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <div className="section-head">
            <div>
              <p className="eyebrow">Record Sale</p>
              <h3>Complete a new sale</h3>
            </div>
          </div>
          {errorMessage ? <p className="inline-upload-error">{errorMessage}</p> : null}
          <label>
            Customer name
            <input
              value={draft.customer_name}
              onChange={(event) => setDraft((current) => ({ ...current, customer_name: event.target.value }))}
              placeholder="Optional"
            />
          </label>
          <div className="sale-payment-toggle">
            <button
              type="button"
              className={draft.payment_method === "cash" ? "payment-toggle active" : "payment-toggle"}
              onClick={() => setDraft((current) => ({ ...current, payment_method: "cash" }))}
            >
              💵 Cash
            </button>
            <button
              type="button"
              className={draft.payment_method === "upi" ? "payment-toggle active" : "payment-toggle"}
              onClick={() => setDraft((current) => ({ ...current, payment_method: "upi" }))}
            >
              📱 UPI
            </button>
          </div>
          <div className="payment-status-block">
            <p className="eyebrow">Payment Status</p>
            <div className="sale-payment-toggle payment-status-toggle">
              <button
                type="button"
                className={draft.payment_status === "paid" ? "payment-toggle active payment-toggle-paid" : "payment-toggle"}
                onClick={() => setDraft((current) => ({ ...current, payment_status: "paid" }))}
              >
                ✓ Paid
              </button>
              <button
                type="button"
                className={draft.payment_status === "pending" ? "payment-toggle active payment-toggle-pending" : "payment-toggle"}
                onClick={() => setDraft((current) => ({ ...current, payment_status: "pending" }))}
              >
                ⏳ Pending
              </button>
            </div>
            {draft.payment_status === "pending" ? (
              <p className="support-copy payment-status-note">
                Stock will still be reduced. Payment can be marked as received later.
              </p>
            ) : null}
          </div>
          <div className="inquiry-products-editor span-2">
            <div className="section-head">
              <div>
                <p className="eyebrow">Products</p>
                <h3>Sale items</h3>
              </div>
              <button type="button" className="ghost-button" onClick={() => setPickerOpen((value) => !value)}>
                Add Product
              </button>
            </div>
            {pickerOpen ? (
              <div className="sale-picker">
                <input
                  className="search-input"
                  type="search"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search products by name or SKU"
                />
                <div className="sale-picker-results">
                  {matchingProducts.map((product) => (
                    <button key={product.id} type="button" className="sale-picker-item" onClick={() => onAddProduct(product)}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.sku}</span>
                      </div>
                      <small>{product.quantity} in stock</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="inquiry-product-editor-list">
              {draft.items.length ? (
                draft.items.map((item, index) => (
                  <div key={`${item.product_sku}-${index}`} className="inquiry-product-editor-card sale-item-card">
                    <div className="sale-item-head">
                      <div>
                        <strong>{item.product_name}</strong>
                        <span>{item.product_sku}</span>
                      </div>
                      <button type="button" className="detail-cancel-link" onClick={() => onRemoveProduct(index)}>
                        ×
                      </button>
                    </div>
                    <div className="inquiry-inline-fields">
                      <label>
                        Quantity
                        <input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          max={item.max_quantity}
                          value={Number(item.quantity_sold || 0) === 0 ? "" : item.quantity_sold}
                          placeholder="0"
                          onClick={handleNumericInputClick}
                          onChange={(event) => onUpdateItem(index, "quantity_sold", event.target.value)}
                        />
                      </label>
                      <label>
                        Selling price
                        <div className="rupee-field">
                          <span>₹</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={Number(item.selling_price || 0) === 0 ? "" : item.selling_price}
                            placeholder="0"
                            onClick={handleNumericInputClick}
                            onChange={(event) => onUpdateItem(index, "selling_price", event.target.value)}
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                ))
              ) : (
                <p className="support-copy">Add at least one product to record this sale.</p>
              )}
            </div>
          </div>
          <label className="span-2">
            Notes
            <textarea
              rows="4"
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
          <div className="sale-total-card span-2">
            <span>Order total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          {confirmation ? (
            <div className="sale-confirm-card span-2">
              <p className="eyebrow">Confirm Sale</p>
              <h3>Stock will be reduced</h3>
              <ul className="sale-confirm-list">
                {confirmation.inventoryChanges.map(({ item, product, nextQuantity }) => (
                  <li key={item.product_sku}>
                    <strong>{item.product_name}</strong>
                    <span>
                      {product.quantity} → {nextQuantity}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="sale-confirm-total">
                Total: <strong>{formatCurrency(confirmation.total)}</strong> ({formatPaymentMethod(confirmation.paymentMethod)})
              </p>
              <div className="detail-edit-actions">
                <button type="button" className="ghost-button" disabled={busy} onClick={onCancelConfirmation}>
                  Cancel
                </button>
                <button type="button" className="primary-button detail-save-button" disabled={busy} onClick={onConfirmSale}>
                  {busy ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </div>
          ) : null}
          <div className="detail-edit-actions">
            <button
              type="button"
              className="primary-button detail-save-button"
              disabled={busy || !draft.items.length || Boolean(confirmation)}
              onClick={onSave}
            >
              {busy ? "Saving..." : "Complete Sale"}
            </button>
            <button type="button" className="detail-cancel-link" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InquiryRecorderModal({
  open,
  supportsSpeechRecognition,
  products,
  isListening,
  transcript,
  manualTranscript,
  setManualTranscript,
  step,
  draft,
  setDraft,
  errorMessage,
  busy,
  onStartListening,
  onStopAndProcess,
  onCancel,
  onBack,
  onSave,
  onProductNameChange,
  onProductFieldChange,
  onAddProductRow,
  onRemoveProductRow
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="inquiry-modal-overlay" onClick={onCancel}>
      <div className="inquiry-modal" onClick={(event) => event.stopPropagation()}>
        {step === "record" ? (
          <div className="inquiry-modal-body">
            <div className="section-head">
              <div>
                <p className="eyebrow">New Inquiry</p>
                <h3>Capture inquiry details</h3>
              </div>
            </div>
            {supportsSpeechRecognition ? (
              <>
                <button
                  type="button"
                  className={isListening ? "mic-record-button active" : "mic-record-button"}
                  onClick={onStartListening}
                >
                  <MicIcon />
                </button>
                <p className="support-copy inquiry-recorder-copy">
                  {isListening ? "Listening in English (India)..." : "Tap the mic to start recording."}
                </p>
                <div className="transcript-box">{transcript || "Live transcript will appear here as you speak."}</div>
              </>
            ) : (
              <>
                <label className="inquiry-textarea-label">
                  Type your inquiry here
                  <textarea
                    rows="9"
                    value={manualTranscript}
                    onChange={(event) => setManualTranscript(event.target.value)}
                    placeholder="Capture the customer inquiry details here..."
                  />
                </label>
              </>
            )}
            {errorMessage ? <p className="inline-upload-error">{errorMessage}</p> : null}
            <div className="detail-edit-actions">
              <button type="button" className="primary-button detail-save-button" disabled={busy} onClick={onStopAndProcess}>
                Done
              </button>
              <button type="button" className="detail-cancel-link" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {step === "extracting" ? (
          <div className="inquiry-modal-body inquiry-loading-state">
            <div className="spinner-ring" />
            <p>Extracting details...</p>
          </div>
        ) : null}

        {step === "confirm" ? (
          <form
            className="inquiry-modal-body inquiry-confirm-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            <div className="section-head">
              <div>
                <p className="eyebrow">Confirm Inquiry</p>
                <h3>Review before saving</h3>
              </div>
            </div>
            {errorMessage ? <p className="inline-upload-error">{errorMessage}</p> : null}
            <label>
              Customer name
              <input
                value={draft.customer_name}
                onChange={(event) => setDraft((current) => ({ ...current, customer_name: event.target.value }))}
              />
            </label>
            <label>
              Customer phone
              <input
                value={draft.customer_phone}
                onChange={(event) => setDraft((current) => ({ ...current, customer_phone: event.target.value }))}
              />
            </label>
            <label>
              Source
              <select
                value={draft.source}
                onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}
              >
                <option value="phone">Phone</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="walkin">Walk-in</option>
              </select>
            </label>
            <label>
              Occasion
              <input
                value={draft.occasion}
                onChange={(event) => setDraft((current) => ({ ...current, occasion: event.target.value }))}
              />
            </label>
            <label>
              Required by date
              <input
                value={draft.required_by_date}
                onChange={(event) => setDraft((current) => ({ ...current, required_by_date: event.target.value }))}
              />
            </label>
            <label>
              Budget per unit
              <div className="rupee-field">
                <span>₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={draft.budget_per_unit}
                  onClick={handleNumericInputClick}
                  onChange={(event) => setDraft((current) => ({ ...current, budget_per_unit: event.target.value }))}
                />
              </div>
            </label>
            <label>
              Total budget
              <div className="rupee-field">
                <span>₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={draft.total_budget}
                  onClick={handleNumericInputClick}
                  onChange={(event) => setDraft((current) => ({ ...current, total_budget: event.target.value }))}
                />
              </div>
            </label>
            <label className="span-2">
              Notes
              <textarea
                rows="4"
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
            <div className="inquiry-products-editor span-2">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Products</p>
                  <h3>Items requested</h3>
                </div>
                <button type="button" className="ghost-button" onClick={onAddProductRow}>
                  Add item
                </button>
              </div>
              <div className="inquiry-product-editor-list">
                {draft.products.map((item, index) => (
                  <div key={`draft-item-${index}`} className="inquiry-product-editor-card">
                    <label>
                      Product name
                      <input
                        value={item.product_name}
                        onChange={(event) => onProductNameChange(index, event.target.value)}
                      />
                    </label>
                    {item.matched_sku ? <span className="matched-sku-badge">{item.matched_sku}</span> : null}
                    <div className="inquiry-inline-fields">
                      <label>
                        Quantity
                        <input
                          type="number"
                          inputMode="numeric"
                          value={item.quantity_requested}
                          onClick={handleNumericInputClick}
                          onChange={(event) => onProductFieldChange(index, "quantity_requested", event.target.value)}
                        />
                      </label>
                      <label>
                        Quoted price
                        <div className="rupee-field">
                          <span>₹</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={item.quoted_price}
                            onClick={handleNumericInputClick}
                            onChange={(event) => onProductFieldChange(index, "quoted_price", event.target.value)}
                          />
                        </div>
                      </label>
                    </div>
                    <button
                      type="button"
                      className="detail-cancel-link"
                      onClick={() => onRemoveProductRow(index)}
                      disabled={draft.products.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="detail-edit-actions">
              <button type="submit" className="primary-button detail-save-button" disabled={busy}>
                {busy ? "Saving..." : "Save Inquiry"}
              </button>
              <button type="button" className="detail-cancel-link" onClick={onBack}>
                Back
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function CustomerPreviewBanner({ onBack }) {
  return (
    <div className="customer-preview-banner">
      <span>You're previewing the customer view — </span>
      <button type="button" onClick={onBack}>
        Back to Admin
      </button>
    </div>
  );
}

function AnnouncementBar({ onShop }) {
  return (
    <section className="announcement-bar" aria-label="Store announcements">
      <div className="announcement-inner">
        <p>
          {ANNOUNCEMENTS.map((message) => (
            <span key={message} className="announcement-item">
              {message}
            </span>
          ))}
        </p>
        <button type="button" onClick={onShop}>
          Shop the festive edit
        </button>
      </div>
    </section>
  );
}

function CustomerUtilityBar() {
  return (
    <div className="customer-utility-bar" aria-label="Store information">
      <span>Rooted in Moradabad, India’s brass city</span>
      <div>
        <span>Razorpay-secured checkout</span>
        <span>Pan-India delivery</span>
        <a href="tel:+919811133661">Brass concierge: +91 98111 33661</a>
      </div>
    </div>
  );
}

function CustomerNavigation({ onSelectCategory, onShop }) {
  const items = [
    getCustomerCollectionById("varalakshmi"),
    getCustomerCollectionById("pooja-diyas"),
    getCustomerCollectionById("urlis-serveware"),
    getCustomerCollectionById("idols-spiritual"),
    getCustomerCollectionById("wall-home"),
    getCustomerCollectionById("home-accents")
  ];

  return (
    <nav className="customer-primary-nav" aria-label="Shop collections">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.path}
          onClick={(event) => {
            event.preventDefault();
            onSelectCategory(item.id, "primary_navigation");
            onShop();
          }}
        >
          {item.label}
        </a>
      ))}
      <a
        href={getBulkWhatsAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackBulkWhatsAppClick("primary_navigation")}
      >
        Business Gifting
      </a>
    </nav>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 18.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Zm10 0a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM4.2 4.5H2V2.6h3.5l.76 3.1H21l-2.1 8.1a2.2 2.2 0 0 1-2.13 1.66H8.16a2.2 2.2 0 0 1-2.13-1.66L4.2 4.5Zm3.03 3.1 1.26 5.3c.04.18.2.3.38.3h7.9c.18 0 .34-.12.38-.3l1.33-5.3H7.23Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CustomerHeader({
  scrolled,
  tickerMessage,
  tickerAction,
  tickerVisible,
  onSearchTap,
  onTickerAction,
  onAdmin,
  onHome,
  cartCount,
  onCartOpen
}) {
  const tickerClassName = scrolled && tickerVisible ? "customer-header-ticker visible" : "customer-header-ticker";
  return (
    <header className={scrolled ? "customer-header scrolled" : "customer-header"}>
      <button type="button" className="customer-header-home" aria-label="Go to Decorbeats home" onClick={onHome}>
        <img src={brandLogo} alt="Decorbeats" className="customer-header-logo" />
        <span className="customer-header-lockup">
          <strong>DECORBEATS</strong>
          <small>THE BRASS HOUSE OF INDIA</small>
        </span>
      </button>
      {tickerAction ? (
        <button
          type="button"
          className={`${tickerClassName} customer-header-ticker-button`}
          aria-hidden={!scrolled}
          onClick={() => onTickerAction(tickerAction)}
        >
          <span>{tickerMessage}</span>
        </button>
      ) : (
        <div className={tickerClassName} aria-hidden={!scrolled}>
          <span>{tickerMessage}</span>
        </div>
      )}
      <button type="button" className="customer-header-admin-link" onClick={onAdmin}>
        Admin
      </button>
      <a
        className="customer-header-concierge"
        href={getRetailWhatsAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackRetailWhatsAppClick("header_concierge")}
      >
        Talk to a brass expert
      </a>
      <button type="button" className="customer-header-cart" aria-label={`Open cart, ${cartCount} items`} onClick={onCartOpen}>
        <CartIcon />
        {cartCount ? <span>{cartCount}</span> : null}
      </button>
      <button type="button" className="customer-header-search" aria-label="Search products" onClick={onSearchTap}>
        <SearchIcon />
      </button>
    </header>
  );
}

function CustomerHero({ slides, featuredProduct, onShop, onSelectCategory }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const heroImage = getPrimaryImage(featuredProduct);
  const preparedSlides = (
    slides.length ? slides : defaultHeroSlides.map((slide) => ({ ...slide, imageUrl: slide.imageUrl || heroImage }))
  ).slice(0, 2);
  const activeSlide = preparedSlides[activeIndex] ?? preparedSlides[0] ?? defaultHeroSlides[0];
  const slideImage = activeSlide.imageUrl || heroImage || defaultHeroSlides[0].imageUrl;
  const mobileSlideImage = activeSlide.mobileImageUrl || slideImage;
  const titleLines = getHeroTitleLines(activeSlide.title);
  const isPosterOnly = Boolean(activeSlide.posterOnly);
  const heroClassName = `customer-hero desktop-reveal hero-content-${activeSlide.contentPosition || "left"}${isPosterOnly ? " hero-poster-slide hero-poster-only" : ""}`;

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const mobileViewport = window.matchMedia?.("(max-width: 767px)").matches;
    if (preparedSlides.length <= 1 || isPaused || isHovering || reduceMotion || mobileViewport) {
      return undefined;
    }
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % preparedSlides.length);
    }, 6800);
    return () => window.clearInterval(intervalId);
  }, [isHovering, isPaused, preparedSlides.length]);

  useEffect(() => {
    if (activeIndex > preparedSlides.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, preparedSlides.length]);

  function handleSlideCta() {
    if (activeSlide.ctaAction === "whatsapp") {
      openBulkWhatsApp("hero-slider");
      return;
    }
    onSelectCategory?.(activeSlide.collectionId || (slideImage.includes("varalakshmi") ? "varalakshmi" : "all"), "hero");
    onShop();
  }

  function selectSlide(index) {
    setActiveIndex(index);
    setIsPaused(true);
  }

  function moveSlide(direction) {
    setActiveIndex((current) => (current + direction + preparedSlides.length) % preparedSlides.length);
    setIsPaused(true);
  }

  return (
    <section
      className={heroClassName}
      aria-label="Decorbeats featured collection"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocusCapture={() => setIsPaused(true)}
    >
      <div className="customer-hero-copy" aria-live="polite">
        <p className="eyebrow">{activeSlide.eyebrow}</p>
        <h1>
          {titleLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h1>
        <p>{activeSlide.body}</p>
        <div className="customer-hero-actions">
          <button type="button" className="primary-button customer-hero-cta" onClick={handleSlideCta}>
            {activeSlide.ctaLabel}
          </button>
          <a
            className="customer-hero-link"
            href={getRetailWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackRetailWhatsAppClick("hero")}
          >
            Talk to a brass expert
          </a>
        </div>
        <div className="customer-hero-proof" aria-label="Shopping assurances">
          <span>Moradabad roots</span>
          <span>Secure checkout</span>
          <span>Pan-India delivery</span>
        </div>
      </div>
      <div className="customer-hero-media">
        {slideImage ? (
          <picture>
            <source media="(max-width: 767px)" srcSet={mobileSlideImage} />
            <img
              src={getOptimizedImageUrl(slideImage, 1200, 72, isPosterOnly ? "contain" : "cover")}
              srcSet={getOptimizedImageSrcSet(
                slideImage,
                [768, 1200],
                72,
                isPosterOnly ? "contain" : "cover"
              )}
              sizes="(max-width: 767px) 100vw, 62vw"
              alt={safeText(activeSlide.title, featuredProduct?.name || "Decorbeats collection").replaceAll("|", " ")}
              width="1600"
              height="800"
              loading="eager"
              fetchpriority="high"
              decoding="async"
            />
          </picture>
        ) : null}
      </div>
      {preparedSlides.length > 1 ? (
        <div className="customer-hero-controls">
          <button type="button" className="customer-hero-arrow" aria-label="Previous campaign" onClick={() => moveSlide(-1)}>
            ←
          </button>
          <div className="customer-hero-dots" aria-label="Featured campaigns">
            {preparedSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={index === activeIndex ? "active" : ""}
                aria-label={`Show campaign ${index + 1}: ${safeText(slide.title).replaceAll("|", " ")}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => selectSlide(index)}
              />
            ))}
          </div>
          <button
              type="button"
              className="customer-hero-arrow"
              aria-label="Next campaign"
              onClick={() => moveSlide(1)}
            >
              →
            </button>
        </div>
      ) : null}
    </section>
  );
}

function CustomerCommercePromise() {
  const items = [
    ["Moradabad expertise", "Selected with roots in India’s brass city"],
    ["Secure checkout", "Protected online payments through Razorpay"],
    ["Pan-India delivery", "Carefully packed for brass and handcrafted décor"],
    ["Human guidance", "Real help from selection through delivery"]
  ];

  return (
    <section className="customer-commerce-promise" aria-label="Why shop with Decorbeats">
      {items.map(([title, detail]) => (
        <article key={title}>
          <strong>{title}</strong>
          <span>{detail}</span>
        </article>
      ))}
    </section>
  );
}

function CustomerCampaignEdit({
  products,
  onSelect,
  onAddToCart,
  busyProductId,
  onViewAll
}) {
  const curated = VARALAKSHMI_EDIT_NAMES.flatMap((name) => {
    const match = products.find(
      (product) => safeText(product.name).toLowerCase() === name.toLowerCase() && isCustomerSellReady(product)
    );
    return match ? [match] : [];
  });
  const curatedIds = new Set(curated.map((product) => String(product.id)));
  const fallback = products.filter(
    (product) =>
      !curatedIds.has(String(product.id)) &&
      isCustomerSellReady(product) &&
      matchesCustomerCollection(product, "varalakshmi")
  );
  const edit = [...curated, ...fallback].slice(0, 6);

  if (!edit.length) {
    return null;
  }

  return (
    <section className="customer-campaign-edit" aria-labelledby="varalakshmi-edit-title">
      <div className="customer-campaign-edit-head">
        <div>
          <p className="eyebrow">The Varalakshmi edit</p>
          <h2 id="varalakshmi-edit-title">Auspicious brass, ready to gift.</h2>
          <p>In-stock diyas and ritual accents selected for homes filled with light and abundance.</p>
        </div>
        <button type="button" className="customer-text-link" onClick={onViewAll}>
          View the full edit <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className="customer-campaign-products">
        {edit.map((product) => {
          const image = getPrimaryImage(product);
          const busy = String(busyProductId) === String(product.id);
          return (
            <article className="customer-campaign-card" key={product.id}>
              <button
                type="button"
                className="customer-campaign-card-main"
                aria-label={`View ${product.name}`}
                onClick={() => onSelect(product)}
              >
                <span className="customer-campaign-card-image">
                  <img
                    src={getOptimizedImageUrl(image, 520, 72)}
                    srcSet={getOptimizedImageSrcSet(image, [320, 520], 72)}
                    sizes="(max-width: 767px) 52vw, 22vw"
                    alt={product.name}
                    width="520"
                    height="620"
                    loading="lazy"
                    decoding="async"
                  />
                  <em>Festive selection</em>
                </span>
                <span className="customer-campaign-card-copy">
                  <strong>{product.name}</strong>
                  <small>{getCustomerProductCollectionLabel(product)}</small>
                  <b>{formatCurrency(product.pricing.mrp)}</b>
                </span>
              </button>
              <button
                type="button"
                className="customer-campaign-card-add"
                onClick={() => onAddToCart(product)}
                disabled={busy}
                aria-label={`Add to bag: ${product.name}`}
              >
                {busy ? "Adding…" : "Add to bag"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BrandAuthorityIntro({ productCount, onShop }) {
  return (
    <section className="customer-authority-intro desktop-reveal" aria-labelledby="brass-house-title">
      <div className="customer-authority-copy">
        <p className="eyebrow">Decorbeats · The Brass House of India</p>
        <h2 id="brass-house-title">One destination. Every expression of brass.</h2>
        <p>
          Our roots are in Moradabad—Pital Nagri—where generations have cast, engraved and finished brass by hand.
          We bring that specialist eye to pieces for prayer, beautiful homes, generous gifting and memorable hospitality.
        </p>
        <button type="button" className="customer-text-link" onClick={onShop}>
          Explore the brass collection <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className="customer-authority-facts" aria-label="Decorbeats expertise">
        <article>
          <strong>Moradabad</strong>
          <span>Roots in India’s brass city</span>
        </article>
        <article>
          <strong>{productCount}+</strong>
          <span>Live pieces across the brass universe</span>
        </article>
        <article>
          <strong>50–400+</strong>
          <span>Custom gifting runs with human support</span>
        </article>
      </div>
    </section>
  );
}

function CustomerOccasionRail({ products, onSelectCategory, onShop }) {
  const occasions = customerOccasions.map((occasion) => {
    const product = findOccasionImageProduct(products, occasion);
    return {
      ...occasion,
      image: product ? getPrimaryImage(product) : ""
    };
  });

  return (
    <section className="customer-occasion-rail" aria-label="Shop the brass universe">
      <div className="customer-occasion-head">
        <p className="eyebrow">Shop the brass universe</p>
        <h2>Begin with the moment you are creating.</h2>
        <p>From a daily diya to a room-defining statement, find brass with purpose and presence.</p>
      </div>
      <div className="customer-occasion-list">
        {occasions.map((occasion) => (
          <button
            key={occasion.label}
            type="button"
            className="customer-occasion-card"
            onClick={() => {
              onSelectCategory(occasion.category, "occasion_card");
              onShop();
            }}
          >
            {occasion.image ? (
              <img
                src={getOptimizedImageUrl(occasion.image, 520, 72)}
                srcSet={getOptimizedImageSrcSet(occasion.image, [320, 520, 720], 72)}
                sizes="(max-width: 767px) 76vw, 25vw"
                alt={`${occasion.label} from Decorbeats`}
                width="520"
                height="700"
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <em>{occasion.beat}</em>
            <span>{occasion.label}</span>
            <small>{occasion.note}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function FeaturedCategoriesRow({ products, onSelectCategory, onShop }) {
  const featuredCategories = ["Bowl", "Diya", "Wall Decor", "Box"];
  const tiles = featuredCategories
    .map((category) => {
      const match = products.find((product) => product.category === category && getPrimaryImage(product));
      return {
        category,
        image: match ? getPrimaryImage(match) : "",
        label: category
      };
    })
    .filter((item) => item.image);

  if (!tiles.length) {
    return null;
  }

  return (
    <section className="featured-categories desktop-reveal">
      {tiles.map((tile) => (
        <button
          key={tile.category}
          type="button"
          className="featured-category-tile"
          onClick={() => {
            onSelectCategory(tile.category, "featured_category");
            onShop();
          }}
        >
          <img
            src={getOptimizedImageUrl(tile.image, 520, 72)}
            srcSet={getOptimizedImageSrcSet(tile.image, [320, 520, 720], 72)}
            sizes="(max-width: 767px) 50vw, 25vw"
            alt={tile.label}
            width="520"
            height="640"
            loading="lazy"
            decoding="async"
          />
          <span>{tile.label}</span>
        </button>
      ))}
    </section>
  );
}

function EditorialSection({ onShop }) {
  return (
    <section className="editorial-section desktop-reveal" aria-labelledby="pital-nagri-title">
      <div className="editorial-media">
        <picture>
          <source media="(max-width: 767px)" srcSet="/assets/images/decorbeats-atelier-campaign-mobile-v2.jpg" />
          <img
            src="/assets/images/decorbeats-atelier-campaign-v2.jpg"
            alt="Decorbeats brass décor styled in a contemporary Indian interior"
            width="1600"
            height="901"
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>
      <div className="editorial-copy">
        <p className="eyebrow">From Pital Nagri to your home</p>
        <h2 id="pital-nagri-title">Brass is not a trend here. It is our language.</h2>
        <p>
          In Moradabad, brass knowledge is passed through hands—how a piece is cast, where weight matters, how engraving
          catches light and how a finish will age.
        </p>
        <p>
          Decorbeats brings that specialist eye to modern Indian homes. We select for material, proportion, finish and
          meaning, so every object feels beautiful today and worth keeping tomorrow.
        </p>
        <ul className="editorial-expertise">
          <li>Pooja and temple brass</li>
          <li>Home, wall and hospitality décor</li>
          <li>Festive, wedding and business gifting</li>
        </ul>
        <div className="editorial-actions">
          <button type="button" className="primary-button" onClick={onShop}>
            Discover the collection
          </button>
          <a
            className="customer-text-link"
            href={getRetailWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackRetailWhatsAppClick("editorial")}
          >
            Ask a brass specialist <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function KnowYourBrass() {
  const guides = [
    {
      number: "01",
      title: "Solid brass or brass finish?",
      copy: "We name the material on every piece. Solid brass has depth and natural weight; brass-finished pieces offer a lighter decorative expression."
    },
    {
      number: "02",
      title: "Let the patina become personal.",
      copy: "Brass naturally deepens with air and touch. Keep the patina for character, or revive the glow gently with a soft dry cloth and brass-safe care."
    },
    {
      number: "03",
      title: "Choose for use, not only looks.",
      copy: "For flame, food or pooja use, follow the care note for that specific piece. Our team can help you choose the right material and finish."
    }
  ];

  return (
    <section className="customer-brass-guide desktop-reveal" aria-labelledby="know-brass-title">
      <div className="customer-brass-guide-head">
        <p className="eyebrow">The brass library</p>
        <h2 id="know-brass-title">Know your brass.</h2>
        <p>Good buying begins with good material knowledge. A few notes from the specialists.</p>
      </div>
      <div className="customer-brass-guide-grid">
        {guides.map((guide) => (
          <article key={guide.number}>
            <span>{guide.number}</span>
            <h3>{guide.title}</h3>
            <p>{guide.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CorporateGiftingSection() {
  return (
    <section className="customer-gifting-studio desktop-reveal" aria-labelledby="gifting-studio-title">
      <div>
        <p className="eyebrow">Decorbeats gifting studio</p>
        <h2 id="gifting-studio-title">Brass gifting, made effortless.</h2>
        <p>
          From 50 to 400+ pieces, we help businesses, wedding families and event teams curate memorable brass gifts with
          thoughtful packaging, practical timelines and one human point of contact.
        </p>
      </div>
      <div className="customer-gifting-steps" aria-label="Gifting service">
        <span><strong>01</strong> Share your occasion, quantity and budget</span>
        <span><strong>02</strong> Receive a curated brass shortlist</span>
        <span><strong>03</strong> Confirm packaging, branding and delivery</span>
      </div>
      <a
        className="customer-gifting-cta"
        href={getBulkWhatsAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackBulkWhatsAppClick("gifting_studio")}
      >
        <WhatsAppIcon />
        <span>Plan your gifting with us</span>
      </a>
    </section>
  );
}

function CustomerFaq() {
  const questions = [
    [
      "Is every Decorbeats piece solid brass?",
      "Our collection includes solid brass as well as selected metal pieces with brass finishes. The material is stated on each product, and our team can help confirm composition before you order."
    ],
    [
      "Will brass change colour over time?",
      "Yes. Natural brass develops a deeper patina with air and touch—many collectors value this character. A soft dry cloth keeps daily dust away; use only brass-safe care when you want a brighter finish."
    ],
    [
      "Can you help with wedding or corporate gifting?",
      "Yes. We support curated orders from 50 to 400+ pieces, including product selection, packaging coordination, branding discussions and delivery planning."
    ],
    [
      "Where does Decorbeats deliver?",
      "We ship across India. Every order is packed with the needs of brass and handcrafted décor in mind, and our team is available if you need help before or after delivery."
    ]
  ];

  return (
    <section className="customer-faq desktop-reveal" aria-labelledby="customer-faq-title">
      <div>
        <p className="eyebrow">Before you choose</p>
        <h2 id="customer-faq-title">Questions, answered by brass people.</h2>
      </div>
      <div className="customer-faq-list">
        {questions.map(([question, answer], index) => (
          <details key={question}>
            <summary>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {question}
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CustomerMobileDock({ cartCount, onShop, onCartOpen }) {
  return (
    <nav className="customer-mobile-dock" aria-label="Quick shopping actions">
      <a
        href={getRetailWhatsAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackRetailWhatsAppClick("mobile_dock")}
      >
        <WhatsAppIcon />
        <span>Expert</span>
      </a>
      <button type="button" className="customer-mobile-shop" onClick={onShop}>
        <span>Shop brass</span>
        <small>Explore the edit</small>
      </button>
      <button type="button" onClick={onCartOpen}>
        <CartIcon />
        <span>Bag{cartCount ? ` (${cartCount})` : ""}</span>
      </button>
    </nav>
  );
}

function CustomerCategoryBar({ collectionFilter, setCollectionFilter }) {
  return (
    <section className="customer-category-row" aria-label="Browse brass collections">
      {CUSTOMER_COLLECTIONS.map((collection) => (
        <button
          key={collection.id}
          type="button"
          className={collection.id === collectionFilter ? "customer-category-chip active" : "customer-category-chip"}
          aria-pressed={collection.id === collectionFilter}
          onClick={() => setCollectionFilter(collection.id, "category_bar")}
        >
          {collection.label}
        </button>
      ))}
    </section>
  );
}

function CustomerEmptyCollection({ onClear }) {
  return (
    <div className="customer-empty-results" role="status">
      <p className="eyebrow">Nothing matched this search</p>
      <h3>Let’s find the right brass piece another way.</h3>
      <p>Clear the filters to explore the full collection, or ask our team for a personal shortlist.</p>
      <div>
        <button type="button" className="primary-button" onClick={onClear}>
          Clear filters
        </button>
        <a
          className="customer-text-link"
          href={getRetailWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackRetailWhatsAppClick("empty_collection")}
        >
          Ask a brass expert
        </a>
      </div>
    </div>
  );
}

function CustomerProductCard({ product, onSelect, onAddToCart, busy }) {
  const primaryImage = getPrimaryImage(product);
  const isNewProduct = isNewArrival(product.createdAt);
  const outOfStock = Number(product.quantity || 0) <= 0;
  return (
    <article className="customer-product-card desktop-reveal">
      <button
        type="button"
        className="customer-product-card-main"
        aria-label={`View ${product.name}`}
        onClick={() => onSelect(product)}
      >
        <div className="customer-product-image-wrap">
        {isNewProduct ? <span className="customer-new-badge">NEW</span> : null}
        {outOfStock ? <span className="customer-sold-out-badge">SOLD OUT</span> : null}
        {product.marketingTag ? <span className="customer-marketing-tag">{product.marketingTag}</span> : null}
        {primaryImage ? (
          <img
            className="customer-product-image"
            src={getOptimizedImageUrl(primaryImage, 640, 72)}
            srcSet={getOptimizedImageSrcSet(primaryImage, [320, 480, 640], 72)}
            sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
            alt={product.name}
            width="640"
            height="780"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="customer-product-image customer-product-fallback">
            <img src={brandLogo} alt="Decorbeats" className="customer-placeholder-logo" loading="lazy" />
          </div>
        )}
          <span className="customer-card-hover-text">View Details</span>
        </div>
        <div className="customer-product-copy">
          <h3>{product.name}</h3>
          <p className="customer-product-category">{product.material} · {product.category}</p>
          <p className="customer-price">
            {hasDisplayValue(product.pricing.mrp) ? formatCurrency(product.pricing.mrp) : "Price on request"}
          </p>
        </div>
      </button>
      {hasDisplayValue(product.pricing.mrp) ? (
        <button
          type="button"
          className="customer-quick-add"
          onClick={() => onAddToCart(product)}
          disabled={busy || outOfStock}
          aria-label={`${outOfStock ? "Sold out" : "Add to bag"}: ${product.name}`}
        >
          {outOfStock ? "Sold out" : busy ? "Adding…" : "Add to bag"}
        </button>
      ) : (
        <button
          type="button"
          className="customer-quick-add"
          onClick={() => onSelect(product)}
          disabled={outOfStock}
          aria-label={`${outOfStock ? "Sold out" : "Enquire about"} ${product.name}`}
        >
          {outOfStock ? "Sold out" : "Enquire"}
        </button>
      )}
    </article>
  );
}

function CustomerProductSkeletonGrid() {
  return (
    <div className="customer-product-skeleton-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="customer-product-skeleton" key={index}>
          <div className="customer-product-skeleton-image" />
          <div className="customer-product-skeleton-line" />
          <div className="customer-product-skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

function CustomerSheet({ product, onClose, onShare, onWhatsApp, onAddToCart, cartBusyProductId, paymentMessage }) {
  const [closing, setClosing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const closeTimerRef = useRef(null);
  const dragStateRef = useRef({ startY: 0, deltaY: 0, dragging: false });
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const videos = getProductVideos(product);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setClosing(false);
    setDragOffset(0);
    if (!product) {
      return undefined;
    }
    previousFocusRef.current = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => dialogRef.current?.focus({ preventScroll: true }));
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll(
            'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (!focusable.length) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousBodyOverflow;
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [product?.id]);

  if (!product) {
    return (
      <div className="customer-sheet-overlay" aria-hidden="true">
        <aside className="customer-sheet" />
      </div>
    );
  }

  const occasionLine = getCustomerProductStory(product);
  const isNewProduct = isNewArrival(product.createdAt);
  const outOfStock = Number(product.quantity || 0) <= 0;
  const dismissSheet = () => {
    if (closing) {
      return;
    }
    setClosing(true);
    setDragOffset(0);
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, 300);
  };
  const resetDrag = () => {
    dragStateRef.current = { startY: 0, deltaY: 0, dragging: false };
    setDragOffset(0);
  };
  const sheetStyle =
    dragOffset > 0
      ? {
          transform: `translateY(${dragOffset}px)`,
          transition: "none"
        }
      : undefined;

  return (
    <div className={closing ? "customer-sheet-overlay open closing" : "customer-sheet-overlay open"} onClick={dismissSheet}>
      <aside
        ref={dialogRef}
        className={closing ? "customer-sheet open closing" : "customer-sheet open"}
        style={sheetStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-product-title"
        tabIndex="-1"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="customer-sheet-handle-zone"
          onTouchStart={(event) => {
            const touch = event.touches[0];
            if (!touch) {
              return;
            }
            dragStateRef.current = {
              startY: touch.clientY,
              deltaY: 0,
              dragging: true
            };
          }}
          onTouchMove={(event) => {
            const touch = event.touches[0];
            const state = dragStateRef.current;
            if (!touch || !state.dragging) {
              return;
            }
            const deltaY = touch.clientY - state.startY;
            state.deltaY = deltaY;
            if (deltaY > 0) {
              setDragOffset(deltaY);
            } else {
              setDragOffset(0);
            }
          }}
          onTouchEnd={(event) => {
            const state = dragStateRef.current;
            if (!state.dragging) {
              return;
            }
            if (state.deltaY > 80) {
              dismissSheet();
            } else {
              resetDrag();
            }
          }}
          onTouchCancel={resetDrag}
        >
          <span className="customer-sheet-handle" aria-hidden="true" />
        </div>
        <button type="button" className="customer-sheet-close" aria-label="Close product details" onClick={dismissSheet}>
          ×
        </button>
        <CustomerImageCarousel product={product} />
        <div className="customer-sheet-copy">
          <p className="customer-sheet-kicker">Decorbeats collection</p>
          <div className="customer-sheet-title-row">
            <h2 id="customer-product-title">{product.name}</h2>
            {isNewProduct ? <span className="customer-sheet-new-badge">New Arrival</span> : null}
            {!isNewProduct && product.marketingTag ? <span className="customer-sheet-new-badge">{product.marketingTag}</span> : null}
          </div>
          <p className="customer-sheet-price">
            {hasDisplayValue(product.pricing.mrp) ? formatCurrency(product.pricing.mrp) : "Price on request"}
          </p>
          {occasionLine ? <p className="customer-sheet-occasion">{occasionLine}</p> : null}
          <dl className="customer-sheet-meta" aria-label="Verified product details">
            <div>
              <dt>Collection</dt>
              <dd>{getCustomerProductCollectionLabel(product)}</dd>
            </div>
            <div>
              <dt>Material</dt>
              <dd>{product.material}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>{outOfStock ? "Sold out" : product.stockStatus}</dd>
            </div>
            {product.size ? (
              <div>
                <dt>Dimensions</dt>
                <dd>{product.size}</dd>
              </div>
            ) : null}
            {product.weight ? (
              <div>
                <dt>Weight</dt>
                <dd>{product.weight}</dd>
              </div>
            ) : null}
          </dl>
          {videos.length ? (
            <div className="customer-sheet-videos">
              <p>Product video</p>
              {videos.map((url, index) => (
                <video
                  key={`${url}-${index}`}
                  className="customer-sheet-video"
                  src={url}
                  controls
                  playsInline
                  preload="metadata"
                />
              ))}
            </div>
          ) : null}
          <div className="customer-sheet-actions">
            {hasDisplayValue(product.pricing.mrp) ? (
              <div className="customer-purchase-panel">
                <div className="customer-purchase-panel-head">
                  <span>Ready to order?</span>
                  <strong>{formatCurrency(product.pricing.mrp)}</strong>
                </div>
                <button
                  type="button"
                  className="customer-pay-button"
                  onClick={() => onAddToCart(product)}
                  disabled={outOfStock || String(cartBusyProductId) === String(product.id)}
                >
                  <span>
                    {outOfStock
                      ? "Currently sold out"
                      : String(cartBusyProductId) === String(product.id)
                        ? "Adding to cart..."
                        : "Add to cart"}
                  </span>
                  <small>{outOfStock ? "Ask us about the next availability" : "Secure checkout with Razorpay"}</small>
                </button>
                <div className="customer-purchase-trust" aria-label="Checkout reassurance">
                  <span>Secure payment</span>
                  <span>WhatsApp order support</span>
                </div>
              </div>
            ) : null}

            <div className="customer-help-panel">
              <p>{hasDisplayValue(product.pricing.mrp) ? "Prefer to confirm details first?" : "Ask us for pricing and availability."}</p>
              <a
                className="customer-whatsapp-button"
                href={getProductWhatsAppUrl(product)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onWhatsApp(product)}
              >
                <WhatsAppIcon />
                <span>Enquire on WhatsApp</span>
              </a>
            </div>

            <button type="button" className="customer-share-link" onClick={() => onShare(product)}>
              Share product
            </button>
            {paymentMessage ? (
              <p className={`customer-payment-note ${paymentMessage.tone}`} aria-live="polite">
                {paymentMessage.text}
              </p>
            ) : null}
          </div>
          <div className="customer-product-expert-note">
            <p className="eyebrow">The specialist’s view</p>
            <h3>Why this piece belongs.</h3>
            <p>{getProductExpertNote(product)}</p>
            <p className="customer-product-disclosure">
              Material is listed as {product.material}. Ask our team to confirm composition, finish, dimensions or care
              before ordering whenever those details are important to your intended use.
            </p>
          </div>
          <div className="customer-product-assurance" aria-label="Order reassurance">
            <span>Material disclosed</span>
            <span>Secure Razorpay checkout</span>
            <span>Pan-India assistance</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function CustomerCartDrawer({
  open,
  items,
  details,
  setDetails,
  busy,
  error,
  success,
  onClose,
  onQuantityChange,
  onRemove,
  onCheckout
}) {
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [checkoutStage, setCheckoutStage] = useState("cart");
  const cartDialogRef = useRef(null);
  const cartPreviousFocusRef = useRef(null);
  const cartCloseRef = useRef(onClose);

  useEffect(() => {
    cartCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setCheckoutStage("cart");
      return undefined;
    }
    cartPreviousFocusRef.current = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => cartDialogRef.current?.focus({ preventScroll: true }));
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        cartCloseRef.current();
        return;
      }
      if (event.key === "Tab" && cartDialogRef.current) {
        const focusable = Array.from(
          cartDialogRef.current.querySelectorAll(
            'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (!focusable.length) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      cartPreviousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="customer-cart-overlay open" onClick={onClose}>
      <aside
        ref={cartDialogRef}
        className="customer-cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-cart-title"
        tabIndex="-1"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="customer-cart-head">
          <div>
            <p className="eyebrow">Decorbeats checkout</p>
            <h2 id="customer-cart-title">{checkoutStage === "cart" ? "Your cart" : "Delivery details"}</h2>
            <span>
              {itemCount
                ? `${checkoutStage === "cart" ? "Step 1 of 2" : "Step 2 of 2"} · ${itemCount} item${itemCount === 1 ? "" : "s"}`
                : "No items yet"}
            </span>
          </div>
          <button type="button" className="customer-sheet-close" aria-label="Close cart" onClick={onClose}>
            ×
          </button>
        </div>

        {error ? <p className="customer-payment-note error" aria-live="assertive">{error}</p> : null}
        {success ? <p className="customer-payment-note success" aria-live="polite">{success}</p> : null}

        {items.length ? (
          <>
            {checkoutStage === "cart" ? (
              <div className="customer-cart-items">
                {items.map((item) => (
                  <article key={item.product.id} className="customer-cart-item">
                    <img
                      src={getOptimizedImageUrl(item.product.imageUrl, 180, 72)}
                      alt=""
                      width="90"
                      height="112"
                      loading="lazy"
                      decoding="async"
                    />
                    <div>
                      <strong>{item.product.name}</strong>
                      <span>{item.product.sku}</span>
                      <b>{formatCurrency(item.price)}</b>
                    </div>
                    <div className="customer-cart-qty">
                      <button type="button" onClick={() => onQuantityChange(item.product.id, item.quantity - 1)} disabled={busy}>
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={item.quantity}
                        onClick={handleNumericInputClick}
                        onChange={(event) => onQuantityChange(item.product.id, Number(event.target.value) || 1)}
                        disabled={busy}
                      />
                      <button type="button" onClick={() => onQuantityChange(item.product.id, item.quantity + 1)} disabled={busy}>
                        +
                      </button>
                      <button type="button" className="customer-cart-remove" onClick={() => onRemove(item.product.id)} disabled={busy}>
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {checkoutStage === "cart" ? (
              <div className="customer-cart-stage-footer">
                <div className="customer-cart-total">
                  <span>Order total</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
                <button type="button" className="primary-button" onClick={() => setCheckoutStage("delivery")}>
                  Continue to delivery
                </button>
                <small>Secure online payment through Razorpay</small>
              </div>
            ) : (
              <button type="button" className="customer-cart-back" onClick={() => setCheckoutStage("cart")}>
                ← Back to your bag
              </button>
            )}

            {checkoutStage === "delivery" ? (
              <form className="customer-checkout-form" onSubmit={onCheckout}>
              <div className="customer-cart-total">
                <span>Order total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <label>
                Full name
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  maxLength="120"
                  value={details.customerName}
                  placeholder="Customer name"
                  onChange={(event) => setDetails((current) => ({ ...current, customerName: event.target.value }))}
                  required
                />
              </label>
              <label>
                Phone number
                <input
                  type="tel"
                  name="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength="15"
                  pattern="[0-9+ -]{10,15}"
                  title="Enter a valid 10 to 15 digit phone number"
                  value={details.phone}
                  placeholder="10-digit mobile number"
                  onChange={(event) => setDetails((current) => ({ ...current, phone: event.target.value }))}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength="160"
                  value={details.email}
                  placeholder="Optional, for payment receipt"
                  onChange={(event) => setDetails((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                Delivery address
                <textarea
                  rows="3"
                  name="street-address"
                  autoComplete="street-address"
                  maxLength="240"
                  value={details.addressLine1}
                  placeholder="House / flat, street, landmark"
                  onChange={(event) => setDetails((current) => ({ ...current, addressLine1: event.target.value }))}
                  required
                />
              </label>
              <div className="customer-checkout-grid">
                <label>
                  City
                  <input
                    type="text"
                    name="address-level2"
                    autoComplete="address-level2"
                    maxLength="100"
                    value={details.city}
                    onChange={(event) => setDetails((current) => ({ ...current, city: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  State
                  <input
                    type="text"
                    name="address-level1"
                    autoComplete="address-level1"
                    maxLength="100"
                    value={details.state}
                    onChange={(event) => setDetails((current) => ({ ...current, state: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  PIN code
                  <input
                    type="text"
                    name="postal-code"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength="6"
                    value={details.pincode}
                    onChange={(event) => setDetails((current) => ({ ...current, pincode: event.target.value }))}
                    required
                  />
                </label>
              </div>
              <label>
                Delivery notes
                <textarea
                  rows="2"
                  name="delivery-notes"
                  maxLength="500"
                  value={details.notes}
                  placeholder="Optional"
                  onChange={(event) => setDetails((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <button type="submit" className="primary-button customer-checkout-button" disabled={busy}>
                {busy ? "Opening secure payment..." : `Pay ${formatCurrency(total)}`}
              </button>
              </form>
            ) : null}
          </>
        ) : (
          <div className="customer-empty-cart">
            <CartIcon />
            <h3>Your cart is waiting for its first beat.</h3>
            <p>Add products from the collection and checkout securely when ready.</p>
            <button type="button" className="primary-button" onClick={onClose}>
              Continue browsing
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function CustomerFooter({ onAdmin, showAdminLink = true }) {
  return (
    <footer className="customer-footer">
      <div className="customer-footer-contact">
        <div className="customer-footer-contact-item">
          <span className="customer-footer-contact-icon" aria-hidden="true">
            ✦
          </span>
          <strong>Bengaluru Experience Center</strong>
          <p>No.126, Nirmaalya, Ground Floor, 1st A Cross, 1st Main Road, Supreme Residency Layout, Kodichikkanahalli, Bengaluru — 560076</p>
        </div>
        <div className="customer-footer-contact-item">
          <span className="customer-footer-contact-icon" aria-hidden="true">
            ♜
          </span>
          <strong>Registered Office</strong>
          <p>Decorbeats (OPC) Pvt. Ltd., B-140, Deen Dayal Nagar, Moradabad, Uttar Pradesh — 244001</p>
        </div>
        <div className="customer-footer-contact-item">
          <span className="customer-footer-contact-icon" aria-hidden="true">
            ✓
          </span>
          <strong>GST Presence</strong>
          <p>Karnataka · Tamil Nadu · Maharashtra</p>
          <p className="customer-footer-mini">Multi-state registered for corporate and bulk orders.</p>
        </div>
      </div>
      <div className="customer-footer-divider" aria-hidden="true" />
      <div className="customer-footer-main">
        <div className="customer-footer-brand">
          <img src={brandLogo} alt="Decorbeats" className="customer-footer-logo" />
          <p>The Brass House of India. Rooted in Moradabad.</p>
        </div>
        <div className="customer-footer-cta">
          <p>For bulk orders of 50+ units</p>
          <p className="customer-footer-mini">
            <a href="tel:+919811133661">+91-9811-133-661</a> ·{" "}
            <a href="mailto:meghagoel@decorbeats.com">meghagoel@decorbeats.com</a>
          </p>
          <a
            className="customer-whatsapp-button footer-whatsapp"
            href={getBulkWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackBulkWhatsAppClick("footer")}
          >
            <WhatsAppIcon />
            <span>WhatsApp</span>
          </a>
        </div>
        <div className="customer-footer-owner">
          {showAdminLink ? (
            <button type="button" className="customer-admin-link" onClick={onAdmin}>
              Admin Login →
            </button>
          ) : null}
        </div>
      </div>
      <div className="customer-footer-divider" aria-hidden="true" />
      <div className="customer-footer-bottom">
        <span>© {new Date().getFullYear()} Decorbeats.</span>
        <span className="customer-footer-bottom-tagline">BRASS EXPERTS FROM PITAL NAGRI</span>
        <span>Moradabad, India</span>
      </div>
    </footer>
  );
}

function ProductMediaManager({
  product,
  busy,
  errorMessage,
  compressionMessage,
  uploadStageMessage,
  onAddImages,
  onDeleteImage,
  onSetCoverImage,
  onAddVideos,
  onDeleteVideo
}) {
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const images = getProductImages(product);
  const videos = getProductVideos(product);

  return (
    <div className="media-manager">
      <div className="media-manager-head">
        <strong>Photos</strong>
        <span>First photo is the cover image</span>
      </div>
      <div className="media-strip">
        {images.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            className={index === 0 ? "media-thumb active" : "media-thumb"}
            onClick={() => onSetCoverImage(product, url)}
          >
            <img src={url} alt={`${product.name} ${index + 1}`} loading="lazy" />
            <span className="media-thumb-label">{index === 0 ? "Cover" : `#${index + 1}`}</span>
            <span
              className="media-delete"
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onDeleteImage(product, url);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onDeleteImage(product, url);
                }
              }}
            >
              ×
            </span>
          </button>
        ))}
        <button type="button" className="media-add-tile" onClick={() => fileInputRef.current?.click()} disabled={busy}>
          <span>+</span>
          <small>{busy ? "Uploading..." : "Add"}</small>
        </button>
      </div>
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) {
            onAddImages(product, files);
          }
          event.target.value = "";
        }}
      />
      <div className="media-manager-head media-manager-head-spaced">
        <strong>Videos</strong>
        <span>Add short product clips for customer confidence</span>
      </div>
      <div className="media-strip">
        {videos.map((url, index) => (
          <div key={`${url}-${index}`} className="media-video-card">
            <video src={url} muted playsInline controls preload="metadata" />
            <span
              className="media-delete"
              role="button"
              tabIndex={0}
              onClick={() => onDeleteVideo(product, url)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onDeleteVideo(product, url);
                }
              }}
            >
              ×
            </span>
          </div>
        ))}
        <button type="button" className="media-add-tile media-video-add" onClick={() => videoInputRef.current?.click()} disabled={busy}>
          <span>+</span>
          <small>{busy ? "Uploading..." : "Video"}</small>
        </button>
      </div>
      <input
        ref={videoInputRef}
        className="visually-hidden"
        type="file"
        accept="video/*"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) {
            onAddVideos(product, files);
          }
          event.target.value = "";
        }}
      />
      {uploadStageMessage ? <p className="compression-note">{uploadStageMessage}</p> : null}
      {compressionMessage ? <p className="compression-note">{compressionMessage}</p> : null}
      {errorMessage ? <p className="inline-upload-error">{errorMessage}</p> : null}
    </div>
  );
}

function CustomerImageCarousel({ product }) {
  const images = getProductImages(product);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartRef = useRef(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [product?.id]);

  if (!images.length) {
    return (
      <div className="customer-sheet-image-wrap">
        <div className="customer-sheet-image customer-product-fallback">
          <img src={brandLogo} alt="Decorbeats" className="customer-placeholder-logo" loading="lazy" />
        </div>
      </div>
    );
  }

  const hasCarousel = images.length > 1;

  return (
    <div className="customer-carousel">
      <div
        className="customer-sheet-image-wrap"
        onTouchStart={(event) => {
          touchStartRef.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStartRef.current == null) {
            return;
          }
          const endX = event.changedTouches[0]?.clientX ?? touchStartRef.current;
          const delta = endX - touchStartRef.current;
          if (Math.abs(delta) > 40 && hasCarousel) {
            setActiveIndex((current) => {
              if (delta < 0) {
                return Math.min(current + 1, images.length - 1);
              }
              return Math.max(current - 1, 0);
            });
          }
          touchStartRef.current = null;
        }}
      >
        <div className="customer-carousel-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {images.map((url, index) => (
            <div key={`${url}-${index}`} className="customer-carousel-slide">
              <img
                className="customer-sheet-image"
                src={getOptimizedImageUrl(url, 1000, 74)}
                srcSet={getOptimizedImageSrcSet(url, [480, 720, 1000], 74)}
                sizes="(max-width: 767px) 100vw, 50vw"
                alt={`${product.name} ${index + 1}`}
                width="1000"
                height="1000"
                loading={index === activeIndex ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
          ))}
        </div>
      </div>
      {hasCarousel ? (
        <>
          <div className="customer-carousel-count" aria-live="polite">
            {activeIndex + 1}/{images.length}
          </div>
          <div className="customer-carousel-thumbs">
            {images.map((url, index) => (
              <button
                key={`${url}-thumb-${index}`}
                type="button"
                className={index === activeIndex ? "customer-carousel-thumb active" : "customer-carousel-thumb"}
                aria-label={`Show ${product.name} image ${index + 1} of ${images.length}`}
                aria-pressed={index === activeIndex}
                onClick={() => setActiveIndex(index)}
              >
                <img
                  src={getOptimizedImageUrl(url, 180, 64)}
                  alt={`${product.name} thumbnail ${index + 1}`}
                  width="180"
                  height="180"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ProductForm({
  form,
  setForm,
  generatedSku,
  onSubmit,
  onReset,
  uploadBusy,
  saveBusy,
  compressionMessage,
  uploadStageMessage,
  onFileChange
}) {
  return (
    <form className="panel-card admin-card" onSubmit={onSubmit}>
      <div className="section-head">
        <div>
          <p className="eyebrow">Product Studio</p>
          <h3>{form.id ? "Edit selected product" : "Add a new product"}</h3>
        </div>
        <button type="button" className="ghost-button" onClick={onReset}>
          Clear
        </button>
      </div>

      <div className="sku-preview-badge">SKU will be: {generatedSku}</div>

      <label className="product-photo-dropzone">
        <CameraIcon />
        <strong>{uploadBusy ? "Uploading..." : "Tap to add product photo"}</strong>
        <span>{form.imageUrl ? "Photo added. You can tap again to replace it." : "Add the product photo first."}</span>
        {form.imageUrl ? <img src={form.imageUrl} alt="Product preview" className="product-photo-preview" /> : null}
        <input type="file" accept="image/*,.heic,.heif" onChange={onFileChange} disabled={uploadBusy} />
      </label>
      {uploadStageMessage ? <p className="compression-note">{uploadStageMessage}</p> : null}
      {compressionMessage ? <p className="compression-note">{compressionMessage}</p> : null}

      <div className="form-grid">
        <label className="span-2">
          What is it?
          <input
            value={form.name}
            placeholder="e.g. 4 Metal Bowls with Tray Yellow"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </label>
        <label>
          What type?
          <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          What material?
          <select value={form.material} onChange={(event) => setForm((current) => ({ ...current, material: event.target.value }))}>
            {materialOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          How many do you have?
          <input
            type="number"
            placeholder="How many in stock right now?"
            value={form.quantity}
            onClick={handleNumericInputClick}
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
          />
        </label>
        <label>
          What's the selling price?
          <div className="rupee-field">
            <span>₹</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Selling price per unit"
              value={form.mrp}
              onClick={handleNumericInputClick}
              onChange={(event) => setForm((current) => ({ ...current, mrp: event.target.value }))}
            />
          </div>
        </label>
        <label>
          Cost Price (your cost)
          <div className="rupee-field">
            <span>₹</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="What did this cost you?"
              value={form.costPrice}
              onClick={handleNumericInputClick}
              onChange={(event) => setForm((current) => ({ ...current, costPrice: event.target.value }))}
            />
          </div>
        </label>
        <label>
          Marketing tag
          <select
            value={form.marketingTag}
            onChange={(event) => setForm((current) => ({ ...current, marketingTag: event.target.value }))}
          >
            {marketingTagOptions.map((option) => (
              <option key={option || "none"} value={option}>
                {option || "No tag"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Size / Dimensions
          <input
            value={form.size}
            placeholder="e.g. 8 x 8 x 4 in"
            onChange={(event) => setForm((current) => ({ ...current, size: event.target.value }))}
          />
        </label>
        <label>
          Weight
          <input
            value={form.weight}
            placeholder="e.g. 850 g or 1.2 kg"
            onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))}
          />
        </label>
        <label>
          Wholesale price?
          <div className="rupee-field">
            <span>₹</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Wholesale price (optional)"
              value={form.b2b}
              onClick={handleNumericInputClick}
              onChange={(event) => setForm((current) => ({ ...current, b2b: event.target.value }))}
            />
          </div>
        </label>
        <label className="span-2">
          Product video URL
          <input
            value={form.videoUrl}
            placeholder="Optional video link"
            onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
          />
        </label>
        <label className="span-2">
          Any notes?
          <textarea
            rows="4"
            placeholder="Any details customers should know?"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </label>
      </div>

      <button type="submit" className="primary-button product-submit-button" disabled={saveBusy}>
        {saveBusy ? "Saving..." : form.id ? "Update product" : "Add Product"}
      </button>
    </form>
  );
}

function ArchivePanel({ product, onArchive, onRestore, archiveBusy }) {
  if (!product) {
    return null;
  }

  return (
    <section className="panel-card admin-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Product Status</p>
          <h3>{product.archivedAt ? "Archived product" : "Archive this product"}</h3>
        </div>
      </div>
      <p className="support-copy">
        {product.archivedAt
          ? "This product is hidden from the live catalog but can be restored at any time."
          : "Archive removes the product from normal views without deleting its data."}
      </p>
      <button
        type="button"
        className={product.archivedAt ? "ghost-button" : "danger-button"}
        disabled={archiveBusy}
        onClick={() => (product.archivedAt ? onRestore(product) : onArchive(product))}
      >
        {archiveBusy ? "Updating..." : product.archivedAt ? "Restore product" : "Archive product"}
      </button>
    </section>
  );
}

function ProductCard({
  product,
  customerMode,
  expanded,
  canManage,
  onSelect,
  onEdit,
  onShare,
  onArchiveToggle,
  onPinToggle,
  onInlineEdit,
  onInlineAddImages,
  onInlineDeleteImage,
  onInlineSetCoverImage,
  onInlineAddVideos,
  onInlineDeleteVideo,
  imageBusy,
  uploadError,
  compressionMessage,
  uploadStageMessage,
  saveBusy,
  archivedVisible = false
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const stockTone = product.quantity <= 0 ? "danger" : product.quantity <= 5 ? "warn" : "ok";

  return (
    <article className={`product-card ${product.archivedAt ? "archived" : ""} ${expanded ? "expanded" : ""}`}>
      <div className="product-card-row" onClick={() => onSelect(product)}>
        <ProductThumb product={product} />
        <div className="product-card-body product-card-body-row">
          <div className="product-card-meta">
            <div className="product-card-top-row">
              <div className="product-card-chip-row">
                <span className="sku-chip">{product.sku}</span>
                {product.pinned ? <span className="pin-chip">Pinned</span> : null}
              </div>
              {!customerMode ? (
                <div className="card-menu-wrap">
                  <button
                    type="button"
                    className="card-menu-button"
                    aria-label={`More actions for ${product.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen((value) => !value);
                    }}
                  >
                    &#8230;
                  </button>
                  {menuOpen ? (
                    <div
                      className="card-menu"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onEdit(product);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onShare(product);
                        }}
                      >
                        Share
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onPinToggle(product, !product.pinned);
                        }}
                      >
                        {product.pinned ? "Unpin" : "Pin to top"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          if (!product.archivedAt) {
                            const shouldArchive = window.confirm("Archive this product? It will be hidden from all views.");
                            if (!shouldArchive) {
                              return;
                            }
                          }
                          onArchiveToggle(product, !product.archivedAt);
                        }}
                      >
                        {product.archivedAt ? "Restore" : "Archive"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <h3>{product.name}</h3>
            <p className="product-meta">{product.category}</p>
          </div>
          <div className={`stock-count-badge ${stockTone}`}>
            {product.archivedAt && archivedVisible ? "Archived" : `${product.quantity} in stock`}
          </div>
        </div>
      </div>
      {expanded ? (
        <DetailPanel
          product={product}
          customerMode={customerMode}
          canManage={canManage}
          onEdit={onInlineEdit}
          onShare={onShare}
          onAddImages={onInlineAddImages}
          onDeleteImage={onInlineDeleteImage}
          onSetCoverImage={onInlineSetCoverImage}
          onAddVideos={onInlineAddVideos}
          onDeleteVideo={onInlineDeleteVideo}
          imageBusy={imageBusy}
          uploadError={uploadError}
          compressionMessage={compressionMessage}
          uploadStageMessage={uploadStageMessage}
          saveBusy={saveBusy}
          inline
        />
      ) : null}
    </article>
  );
}

function DetailPanel({
  product,
  customerMode,
  canManage,
  onEdit,
  onShare,
  onAddImages,
  onDeleteImage,
  onSetCoverImage,
  onAddVideos,
  onDeleteVideo,
  imageBusy,
  uploadError,
  compressionMessage,
  uploadStageMessage,
  saveBusy,
  inline = false
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    mrp: "",
    costPrice: "",
    b2b: "",
    quantity: "",
    size: "",
    weight: "",
    marketingTag: "",
    notes: ""
  });
  const marginMeta = getMarginMeta(product?.pricing?.mrp, product?.pricing?.costPrice ?? product?.pricing?.unitCost);
  useEffect(() => {
    if (!product) {
      return;
    }
    setDraft({
      name: product.name ?? "",
      mrp: product.pricing.mrp ?? "",
      costPrice: product.pricing.costPrice ?? product.pricing.unitCost ?? "",
      b2b: product.pricing.b2b ?? "",
      quantity: product.quantity ?? 0,
      size: product.size ?? "",
      weight: product.weight ?? "",
      marketingTag: product.marketingTag ?? "",
      notes: product.notes ?? ""
    });
    setEditing(false);
  }, [product]);

  if (!product) {
    return (
      <aside className={inline ? "detail-panel detail-panel-inline panel-card" : "detail-panel panel-card"}>
        <div className="detail-empty">
          <p className="eyebrow">Selection</p>
          <h3>Choose a product to see full details.</h3>
        </div>
      </aside>
    );
  }

  return (
    <aside className={inline ? "detail-panel detail-panel-inline panel-card" : "detail-panel panel-card"}>
      <div className="detail-image-wrap">
        <ProductImage product={product} />
        {canManage && !customerMode ? (
          <>
            <span className="detail-image-hint">{imageBusy ? "Updating gallery..." : "Tap a thumbnail to set cover image"}</span>
            <ProductMediaManager
              product={product}
              busy={imageBusy}
              errorMessage={uploadError}
              compressionMessage={compressionMessage}
              uploadStageMessage={uploadStageMessage}
              onAddImages={onAddImages}
              onDeleteImage={onDeleteImage}
              onSetCoverImage={onSetCoverImage}
              onAddVideos={onAddVideos}
              onDeleteVideo={onDeleteVideo}
            />
          </>
        ) : null}
      </div>
      <div className="section-head">
        <div>
          <h3>{product.name}</h3>
        </div>
      </div>
      {!editing ? (
        <>
          <div className="detail-grid">
            <div>
              <span>SKU</span>
              <strong>{product.sku}</strong>
            </div>
            <div>
              <span>Category</span>
              <strong>{product.category}</strong>
            </div>
            <div>
              <span>Material</span>
              <strong>{product.material}</strong>
            </div>
            {product.size ? (
              <div>
                <span>Size</span>
                <strong>{product.size}</strong>
              </div>
            ) : null}
            {product.weight ? (
              <div>
                <span>Weight</span>
                <strong>{product.weight}</strong>
              </div>
            ) : null}
            <div className="detail-quantity-block">
              <span>Quantity</span>
              <div className="detail-quantity-row">
                <strong>{product.quantity}</strong>
                {canManage && !customerMode ? (
                  <span
                    className={`stock-count-badge ${
                      product.quantity <= 0 ? "danger" : product.quantity <= 5 ? "warn" : "ok"
                    }`}
                  >
                    {product.quantity <= 0 ? "Out of stock" : product.quantity <= 5 ? "Low stock" : "In stock"}
                  </span>
                ) : null}
              </div>
            </div>
            {canManage && !customerMode && hasDisplayValue(product.pricing.costPrice ?? product.pricing.unitCost) ? (
            <div>
              <span>Cost Price</span>
              <strong>{formatCurrency(product.pricing.costPrice ?? product.pricing.unitCost)}</strong>
            </div>
          ) : null}
            {canManage && !customerMode && product.marketingTag ? (
              <div>
                <span>Marketing tag</span>
                <strong>{product.marketingTag}</strong>
              </div>
            ) : null}
            {hasDisplayValue(product.pricing.mrp) ? (
              <div>
                <span>MRP</span>
                <strong>{formatCurrency(product.pricing.mrp)}</strong>
                {canManage && !customerMode && marginMeta ? (
                  <small className={`detail-margin ${marginMeta.tone}`}>{marginMeta.label}</small>
                ) : null}
              </div>
            ) : null}
            {hasDisplayValue(product.pricing.b2b) ? (
              <div>
                <span>B2B</span>
                <strong>{formatCurrency(product.pricing.b2b)}</strong>
              </div>
            ) : null}
          </div>
          {product.notes && product.notes.trim() !== product.name.trim() ? <p className="detail-note">{product.notes}</p> : null}
          {canManage && !customerMode ? (
            <div className="detail-actions detail-actions-inline">
              <button type="button" className="ghost-button detail-action-button" onClick={() => setEditing(true)}>
                Edit Product
              </button>
              <button type="button" className="primary-button detail-action-button detail-share-button" onClick={() => onShare(product)}>
                <ShareIcon />
                <span>Share</span>
              </button>
            </div>
          ) : (
            <div className="detail-actions detail-actions-inline">
              <button type="button" className="primary-button detail-action-button detail-share-button" onClick={() => onShare(product)}>
                <ShareIcon />
                <span>Share</span>
              </button>
            </div>
          )}
        </>
      ) : null}
      {editing && canManage && !customerMode ? (
        <form
          className="detail-edit-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const didSave = await onEdit(product, draft);
            if (didSave !== false) {
              setEditing(false);
            }
          }}
        >
          <label>
            Name
            <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <div>
            <span>MRP</span>
            <input
              type="number"
              inputMode="decimal"
              value={draft.mrp}
              onClick={handleNumericInputClick}
              onChange={(event) => setDraft((current) => ({ ...current, mrp: event.target.value }))}
            />
          </div>
          <div>
            <span>Cost Price</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="What did this cost you?"
              value={draft.costPrice}
              onClick={handleNumericInputClick}
              onChange={(event) => setDraft((current) => ({ ...current, costPrice: event.target.value }))}
            />
          </div>
          <div>
            <span>Marketing tag</span>
            <select
              value={draft.marketingTag}
              onChange={(event) => setDraft((current) => ({ ...current, marketingTag: event.target.value }))}
            >
              {marketingTagOptions.map((option) => (
                <option key={option || "none"} value={option}>
                  {option || "No tag"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span>B2B price</span>
            <input
              type="number"
              inputMode="decimal"
              value={draft.b2b}
              onClick={handleNumericInputClick}
              onChange={(event) => setDraft((current) => ({ ...current, b2b: event.target.value }))}
            />
          </div>
          <label>
            Size / Dimensions
            <input
              value={draft.size}
              placeholder="e.g. 8 x 8 x 4 in"
              onChange={(event) => setDraft((current) => ({ ...current, size: event.target.value }))}
            />
          </label>
          <label>
            Weight
            <input
              value={draft.weight}
              placeholder="e.g. 850 g or 1.2 kg"
              onChange={(event) => setDraft((current) => ({ ...current, weight: event.target.value }))}
            />
          </label>
          <label>
            Quantity
            <input
              type="number"
              inputMode="numeric"
              value={draft.quantity}
              onClick={handleNumericInputClick}
              onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))}
            />
          </label>
          <label className="span-2">
            Description
            <textarea rows="4" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
          </label>
          <div className="detail-edit-actions">
            <button type="submit" className="primary-button detail-save-button" disabled={saveBusy}>
              {saveBusy ? "Saving..." : "Save"}
            </button>
            <button type="button" className="detail-cancel-link" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </aside>
  );
}

function CatalogSection({
  products,
  customerMode,
  selectedId,
  canManage,
  onSelect,
  onEdit,
  onShare,
  onArchiveToggle,
  onPinToggle,
  onInlineEdit,
  onInlineAddImages,
  onInlineDeleteImage,
  onInlineSetCoverImage,
  onInlineAddVideos,
  onInlineDeleteVideo,
  imageBusy,
  uploadError,
  compressionMessage,
  uploadStageMessage,
  saveBusy,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  categories,
  archivedVisible = false
}) {
  return (
    <>
      <ControlBar
        search={search}
        setSearch={setSearch}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        categories={categories}
      />
      <main className="content-grid">
        <section className="catalog-grid">
          {products.length ? (
            products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                customerMode={customerMode}
                expanded={selectedId === product.id}
                canManage={canManage}
                onSelect={onSelect}
                onEdit={onEdit}
                onShare={onShare}
                onArchiveToggle={onArchiveToggle}
                onPinToggle={onPinToggle}
                onInlineEdit={onInlineEdit}
                onInlineAddImages={onInlineAddImages}
                onInlineDeleteImage={onInlineDeleteImage}
                onInlineSetCoverImage={onInlineSetCoverImage}
                onInlineAddVideos={onInlineAddVideos}
                onInlineDeleteVideo={onInlineDeleteVideo}
                imageBusy={imageBusy}
                uploadError={uploadError}
                compressionMessage={compressionMessage}
                uploadStageMessage={uploadStageMessage}
                saveBusy={saveBusy}
                archivedVisible={archivedVisible}
              />
            ))
          ) : (
            <div className="panel-card empty-state">
              <p className="eyebrow">Nothing here</p>
              <h3>No products match this view.</h3>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function BottomNav({ activeTab, setActiveTab, lowStockCount }) {
  const items = [
    { id: "products", label: "Products", icon: <GridIcon /> },
    { id: "sales", label: "Sales", icon: <ReceiptIcon /> },
    { id: "purchases", label: "Purchases", icon: <BoxIcon /> },
    { id: "low-stock", label: "Low Stock", icon: <WarningIcon />, badge: lowStockCount },
    { id: "settings", label: "Settings", icon: <GearIcon /> }
  ];

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={activeTab === item.id ? "nav-item active" : "nav-item"}
          onClick={() => setActiveTab(item.id)}
        >
          <span className={item.badge ? "nav-icon nav-icon-alert" : "nav-icon"}>
            {item.icon}
            {item.badge ? <small>{item.badge}</small> : null}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [storefrontLoading, setStorefrontLoading] = useState(isSupabaseConfigured);
  const [inquiries, setInquiries] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [shareCatalogues, setShareCatalogues] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [expandedInquiryId, setExpandedInquiryId] = useState(null);
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [customerCollection, setCustomerCollection] = useState("all");
  const [visibleCustomerProductCount, setVisibleCustomerProductCount] = useState(12);
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState("all");
  const [statusMessage, setStatusMessage] = useState(
    isSupabaseConfigured
      ? "Supabase is connected. Sign in to manage products, import stock, and upload imagery."
      : "Supabase env vars are not set yet, so the app is running with your local seed inventory."
  );
  const [form, setForm] = useState(emptyForm);
  const [saveBusy, setSaveBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [compressionMessage, setCompressionMessage] = useState("");
  const [uploadStageMessage, setUploadStageMessage] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [inquiryBusy, setInquiryBusy] = useState(false);
  const [salesBusy, setSalesBusy] = useState(false);
  const [deletingSaleId, setDeletingSaleId] = useState("");
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [showArchived, setShowArchived] = useState(false);
  const [publicScreen, setPublicScreen] = useState(getInitialPublicScreen);
  const [routeIntent, setRouteIntent] = useState(() =>
    typeof window === "undefined" ? { screen: "customer", type: "home", slug: "" } : parseLegacyPath(window.location.pathname)
  );
  const [activeTab, setActiveTab] = useState("products");
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState([]);
  const [csvPreviewPayload, setCsvPreviewPayload] = useState([]);
  const [csvPreviewFileName, setCsvPreviewFileName] = useState("");
  const [customerHeaderElevated, setCustomerHeaderElevated] = useState(false);
  const [headerTickerIndex, setHeaderTickerIndex] = useState(0);
  const [headerTickerVisible, setHeaderTickerVisible] = useState(true);
  const [previewCustomerView, setPreviewCustomerView] = useState(false);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryModalStep, setInquiryModalStep] = useState("record");
  const [inquiryTranscript, setInquiryTranscript] = useState("");
  const [manualInquiryTranscript, setManualInquiryTranscript] = useState("");
  const [inquiryDraft, setInquiryDraft] = useState(createEmptyInquiryDraft());
  const [inquiryModalError, setInquiryModalError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleDraft, setSaleDraft] = useState(createEmptySaleDraft());
  const [salePaymentStatusFilter, setSalePaymentStatusFilter] = useState("all");
  const [saleProductSearch, setSaleProductSearch] = useState("");
  const [salePickerOpen, setSalePickerOpen] = useState(false);
  const [saleConfirmation, setSaleConfirmation] = useState(null);
  const [saleModalError, setSaleModalError] = useState("");
  const [markingSalePaidId, setMarkingSalePaidId] = useState("");
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseDraft, setPurchaseDraft] = useState(createEmptyPurchaseDraft());
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState("all");
  const [updatingPurchaseStatusId, setUpdatingPurchaseStatusId] = useState("");
  const [purchaseProductSearch, setPurchaseProductSearch] = useState("");
  const [purchasePickerOpen, setPurchasePickerOpen] = useState(false);
  const [purchaseModalError, setPurchaseModalError] = useState("");
  const [paymentBusyProductId, setPaymentBusyProductId] = useState("");
  const [paymentMessage, setPaymentMessage] = useState(null);
  const [cartItems, setCartItems] = useState(getStoredCartItems);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutDetails, setCheckoutDetails] = useState(createEmptyCheckoutDetails);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState("");
  const [cartBusyProductId, setCartBusyProductId] = useState("");
  const [heroSlideForm, setHeroSlideForm] = useState(createEmptyHeroSlideForm);
  const [heroSlideBusy, setHeroSlideBusy] = useState(false);
  const [heroSlideError, setHeroSlideError] = useState("");
  const [catalogueModalOpen, setCatalogueModalOpen] = useState(false);
  const [catalogueDraft, setCatalogueDraft] = useState(createEmptyCatalogueDraft());
  const [catalogueProductSearch, setCatalogueProductSearch] = useState("");
  const [cataloguePickerOpen, setCataloguePickerOpen] = useState(false);
  const [catalogueBusy, setCatalogueBusy] = useState(false);
  const [catalogueError, setCatalogueError] = useState("");
  const [publicCatalogue, setPublicCatalogue] = useState(null);
  const [publicCatalogueStatus, setPublicCatalogueStatus] = useState("idle");
  const [publicCatalogueError, setPublicCatalogueError] = useState("");
  const productGridRef = useRef(null);
  const customerSearchRef = useRef(null);
  const recognitionRef = useRef(null);
  const compressionTimerRef = useRef(null);
  const pendingRouteIntentRef = useRef(
    typeof window === "undefined" ? null : parseLegacyPath(window.location.pathname)
  );
  const speechSupported =
    typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (isSupabaseConfigured) {
      return undefined;
    }

    let cancelled = false;
    import("./data/products").then(({ products: localProducts }) => {
      if (!cancelled) {
        setProducts(localProducts.map(toProduct));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let cancelled = false;

    async function loadStorefront() {
      let productData;
      let heroData;

      try {
        const response = await fetch("/api/catalog", {
          headers: { Accept: "application/json" }
        });
        if (!response.ok) {
          throw new Error("Catalogue cache is unavailable");
        }
        const payload = await response.json();
        productData = payload.products;
        heroData = payload.heroSlides;
      } catch {
        const client = await getSupabaseClient();
        if (!client) {
          throw new Error("Supabase is unavailable");
        }
        const [productResult, heroResult] = await Promise.all([
          client.from("products").select("*").order("created_at", { ascending: false }),
          client
            .from("hero_slides")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
        ]);

        if (productResult.error) {
          throw productResult.error;
        }
        productData = productResult.data;
        heroData = heroResult.error ? [] : heroResult.data;
      }

      if (cancelled) {
        return;
      }

      const nextProducts = (productData ?? []).map(toProduct);
      setProducts(nextProducts);
      setSelectedId(null);
      setLastSyncAt(new Date().toISOString());
      setHeroSlides(
        (heroData ?? [])
          .map(toHeroSlide)
          .filter((slide) => slide.active)
          .sort((left, right) => left.sortOrder - right.sortOrder)
      );
      setStatusMessage(
        nextProducts.length
          ? `Loaded ${nextProducts.length} products from Supabase.`
          : "Supabase is connected. Add products manually or import your CSV."
      );
      setStorefrontLoading(false);
    }

    loadStorefront().catch((error) => {
      if (!cancelled) {
        console.error("Could not load storefront:", error);
        setStatusMessage("Supabase is configured, but product data could not be loaded.");
        setStorefrontLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || publicScreen !== "admin-auth") {
      return undefined;
    }

    let cancelled = false;
    let authSubscription = null;
    setAuthReady(false);

    async function restoreAdminSession() {
      try {
        const client = await getSupabaseClient();
        if (!client || cancelled) {
          return;
        }

        const { data } = await client.auth.getSession();
        if (!cancelled) {
          setSession(data.session ?? null);
          setAuthReady(true);
        }

        const {
          data: { subscription }
        } = client.auth.onAuthStateChange((_event, nextSession) => {
          if (!cancelled) {
            setSession(nextSession ?? null);
            setAuthReady(true);
          }
        });
        authSubscription = subscription;
      } catch (error) {
        console.error("Could not initialize secure admin access:", error);
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    }

    void restoreAdminSession();

    return () => {
      cancelled = true;
      authSubscription?.unsubscribe();
    };
  }, [publicScreen]);

  const userEmail = session?.user?.email ?? "";
  const canManage = Boolean(userEmail) || !isSupabaseConfigured;
  const adminActive = Boolean(userEmail) || !isSupabaseConfigured;

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user?.id) {
      return undefined;
    }

    let cancelled = false;

    async function loadAdminData() {
      const [productResult, inquiryResult, salesResult, purchaseResult, catalogueResult] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("inquiries").select("*, inquiry_items(*)").order("created_at", { ascending: false }),
        supabase.from("sales").select("*, sale_items(*)").order("created_at", { ascending: false }),
        supabase.from("purchases").select("*, purchase_items(*)").order("created_at", { ascending: false }),
        supabase
          .from("share_catalogues")
          .select("*, share_catalogue_items(*)")
          .order("created_at", { ascending: false })
      ]);

      if (cancelled) {
        return;
      }

      if (!productResult.error) {
        setProducts((productResult.data ?? []).map(toProduct));
      }
      if (!inquiryResult.error) {
        setInquiries((inquiryResult.data ?? []).map(toInquiry));
      }
      if (!salesResult.error) {
        setSales((salesResult.data ?? []).map(toSale));
      }
      if (!purchaseResult.error) {
        setPurchases((purchaseResult.data ?? []).map(toPurchase));
      }
      if (!catalogueResult.error) {
        setShareCatalogues((catalogueResult.data ?? []).map(toShareCatalogue));
      }
    }

    loadAdminData();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (adminActive && routeIntent.type !== "catalogue") {
      setPublicScreen("customer");
      setActiveTab("products");
    }
  }, [adminActive, routeIntent.type]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    function syncPublicScreenFromPath() {
      const nextRoute = parseLegacyPath(window.location.pathname);
      setPublicScreen(nextRoute.screen);
      setRouteIntent(nextRoute);
      pendingRouteIntentRef.current = nextRoute;
    }

    window.addEventListener("popstate", syncPublicScreenFromPath);
    return () => window.removeEventListener("popstate", syncPublicScreenFromPath);
  }, []);

  useEffect(() => {
    setUploadError("");
  }, [selectedId]);

  useEffect(() => {
    return () => {
      if (compressionTimerRef.current) {
        window.clearTimeout(compressionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!adminActive) {
      setPreviewCustomerView(false);
    }
  }, [adminActive]);

  useEffect(() => {
    if (adminActive) {
      return undefined;
    }

    function handleScroll() {
      if (window.innerWidth >= 768) {
        setCustomerHeaderElevated(window.scrollY > 50);
        return;
      }

      setCustomerHeaderElevated(window.scrollY > 8);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [adminActive]);

  useEffect(() => {
    const tickerIsVisible = typeof window !== "undefined" && !window.matchMedia("(max-width: 1100px)").matches;
    if (adminActive || !customerHeaderElevated || !tickerIsVisible) {
      setHeaderTickerVisible(true);
      return undefined;
    }

    let cycleTimeoutId = null;
    let swapTimeoutId = null;

    const scheduleNext = () => {
      cycleTimeoutId = window.setTimeout(() => {
        setHeaderTickerVisible(false);
        swapTimeoutId = window.setTimeout(() => {
          setHeaderTickerIndex((current) => (current + 1) % TICKER_MESSAGES.length);
          setHeaderTickerVisible(true);
          scheduleNext();
        }, 300);
      }, 3500);
    };

    scheduleNext();

    return () => {
      if (cycleTimeoutId) {
        window.clearTimeout(cycleTimeoutId);
      }
      if (swapTimeoutId) {
        window.clearTimeout(swapTimeoutId);
      }
    };
  }, [adminActive, customerHeaderElevated]);

  const customerCatalog = useMemo(() => {
    return [...products]
      .filter((product) => !product.archivedAt)
      .sort((left, right) => {
        const sellReadyDelta = Number(isCustomerSellReady(right)) - Number(isCustomerSellReady(left));
        if (sellReadyDelta !== 0) {
          return sellReadyDelta;
        }
        const leftFeaturedRank = getCustomerFeaturedRank(left);
        const rightFeaturedRank = getCustomerFeaturedRank(right);
        if (leftFeaturedRank !== rightFeaturedRank) {
          return leftFeaturedRank - rightFeaturedRank;
        }
        if (left.pinned !== right.pinned) {
          return Number(right.pinned) - Number(left.pinned);
        }
        const brassDelta =
          Number(safeText(right.material).toLowerCase() === "brass") -
          Number(safeText(left.material).toLowerCase() === "brass");
        if (brassDelta !== 0) {
          return brassDelta;
        }
        const marketingDelta = Number(Boolean(right.marketingTag)) - Number(Boolean(left.marketingTag));
        if (marketingDelta !== 0) {
          return marketingDelta;
        }
        const rightCreatedAt = new Date(right.createdAt || 0).getTime();
        const leftCreatedAt = new Date(left.createdAt || 0).getTime();
        if (Number.isFinite(rightCreatedAt) && Number.isFinite(leftCreatedAt) && rightCreatedAt !== leftCreatedAt) {
          return rightCreatedAt - leftCreatedAt;
        }
        return String(right.id ?? "").localeCompare(String(left.id ?? ""));
      });
  }, [products]);
  const customerFacing = !adminActive || previewCustomerView;
  const adminCatalog = useMemo(() => products.filter((product) => showArchived || !product.archivedAt), [products, showArchived]);
  const lowStockCatalog = useMemo(() => adminCatalog.filter((product) => product.quantity <= 10), [adminCatalog]);

  const currentCatalog = useMemo(() => {
    if (customerFacing) {
      return customerCatalog;
    }
    if (activeTab === "low-stock") {
      return lowStockCatalog;
    }
    return adminCatalog;
  }, [activeTab, adminCatalog, customerCatalog, customerFacing, lowStockCatalog]);

  const categories = useMemo(() => {
    return [
      "All",
      ...new Set(
        currentCatalog
          .map((product) => product.category)
          .filter(Boolean)
          .sort((left, right) => left.localeCompare(right))
      )
    ];
  }, [currentCatalog]);

  const filteredProducts = useMemo(() => {
    const visibleProducts = currentCatalog.filter((product) => {
      const haystack = [product.name, product.sku, product.category, product.material].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesCategory = customerFacing
        ? matchesCustomerCollection(product, customerCollection)
        : categoryFilter === "All" || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    if (customerFacing) {
      return visibleProducts;
    }

    return [...visibleProducts].sort((left, right) => {
      const quantityDelta = Number(right.quantity || 0) - Number(left.quantity || 0);
      if (quantityDelta !== 0) {
        return quantityDelta;
      }
      return left.name.localeCompare(right.name);
    });
  }, [categoryFilter, currentCatalog, customerCollection, customerFacing, search]);

  useEffect(() => {
    setVisibleCustomerProductCount(12);
  }, [categoryFilter, customerCollection, search]);

  const visibleCustomerProducts = useMemo(
    () => filteredProducts.slice(0, visibleCustomerProductCount),
    [filteredProducts, visibleCustomerProductCount]
  );

  const cartLines = useMemo(() => {
    return cartItems
      .map((item) => {
        const product = products.find((entry) => String(entry.id) === String(item.productId));
        const price = parsePrice(product?.pricing?.mrp);
        if (!product || product.archivedAt || !price) {
          return null;
        }
        const availableQuantity = Math.max(0, Number(product.quantity || 0));
        if (availableQuantity <= 0) {
          return null;
        }
        const quantity = Math.max(1, Math.min(Number(item.quantity) || 1, availableQuantity));
        return {
          product,
          quantity,
          price,
          lineTotal: price * quantity
        };
      })
      .filter(Boolean);
  }, [cartItems, products]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0),
    [cartItems]
  );

  useEffect(() => {
    if (!products.length) {
      return;
    }
    setCartItems((current) =>
      current.flatMap((item) => {
        const product = products.find((entry) => String(entry.id) === String(item.productId));
        const availableQuantity = Math.max(0, Number(product?.quantity || 0));
        if (!product || product.archivedAt || availableQuantity <= 0 || !parsePrice(product.pricing?.mrp)) {
          return [];
        }
        return [{ ...item, quantity: Math.min(item.quantity, availableQuantity) }];
      })
    );
  }, [products]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // Shopping remains available when storage is blocked or full.
    }
  }, [cartItems]);

  const filteredInquiries = useMemo(() => {
    const statusFiltered =
      inquiryStatusFilter === "all" ? inquiries : inquiries.filter((inquiry) => inquiry.status === inquiryStatusFilter);
    return [...statusFiltered].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }, [inquiries, inquiryStatusFilter]);
  const filteredSales = useMemo(() => {
    const filtered = salePaymentStatusFilter === "all" ? sales : sales.filter((sale) => sale.paymentStatus === salePaymentStatusFilter);
    return [...filtered].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }, [sales, salePaymentStatusFilter]);
  const filteredPurchases = useMemo(() => {
    const filtered = purchaseStatusFilter === "all" ? purchases : purchases.filter((purchase) => purchase.status === purchaseStatusFilter);
    return [...filtered].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }, [purchaseStatusFilter, purchases]);

  const selectedProduct =
    filteredProducts.find((product) => product.id === selectedId) ||
    currentCatalog.find((product) => product.id === selectedId) ||
    products.find((product) => product.id === selectedId) ||
    null;

  useEffect(() => {
    setPaymentMessage(null);
  }, [selectedId]);

  useEffect(() => {
    const pendingRoute = pendingRouteIntentRef.current;
    if (!pendingRoute || pendingRoute.screen !== "customer") {
      return;
    }

    if (isSupabaseConfigured && !lastSyncAt) {
      return;
    }

    if (pendingRoute.type === "home") {
      setCustomerCollection("all");
      pendingRouteIntentRef.current = null;
      return;
    }

    if (pendingRoute.type === "category") {
      const matchedCollection = resolveCustomerCollectionId(pendingRoute.slug);
      setSelectedId(null);
      setCategoryFilter("All");
      if (matchedCollection) {
        setCustomerCollection(matchedCollection);
        setSearch("");
      } else {
        setCustomerCollection("all");
        setSearch(humanizeSlug(pendingRoute.slug));
      }
      pendingRouteIntentRef.current = null;
      return;
    }

    if (pendingRoute.type === "product") {
      const matchedProduct =
        customerCatalog.find((product) => product.slug === pendingRoute.slug) ||
        customerCatalog.find((product) => slugify(product.name) === pendingRoute.slug) ||
        customerCatalog.find((product) => slugify(`${product.sku}-${product.name}`) === pendingRoute.slug) ||
        null;

      if (matchedProduct) {
        setCategoryFilter("All");
        setCustomerCollection("all");
        setSearch("");
        setSelectedId(matchedProduct.id);
      } else {
        setSelectedId(null);
        setCategoryFilter("All");
        setCustomerCollection("all");
        setSearch(humanizeSlug(pendingRoute.slug));
      }
      pendingRouteIntentRef.current = null;
    }
  }, [customerCatalog, isSupabaseConfigured, lastSyncAt, routeIntent.slug, routeIntent.type]);

  useEffect(() => {
    if (routeIntent.type !== "catalogue") {
      setPublicCatalogue(null);
      setPublicCatalogueStatus("idle");
      setPublicCatalogueError("");
      return undefined;
    }

    setPublicScreen("catalogue");
    let cancelled = false;

    async function loadPublicCatalogue() {
      setPublicCatalogueStatus("loading");
      setPublicCatalogueError("");

      if (!isSupabaseConfigured) {
        const localMatch = shareCatalogues.find((catalogue) => catalogue.slug === routeIntent.slug) ?? null;
        if (!cancelled) {
          setPublicCatalogue(localMatch);
          setPublicCatalogueStatus(localMatch ? "ready" : "error");
          setPublicCatalogueError(localMatch ? "" : "This catalogue is not available in local preview mode.");
        }
        return;
      }

      const client = await getSupabaseClient();
      if (!client) {
        setPublicCatalogueStatus("error");
        setPublicCatalogueError("This catalogue is temporarily unavailable.");
        return;
      }

      const { data, error } = await client
        .from("share_catalogues")
        .select("*, share_catalogue_items(*)")
        .eq("slug", routeIntent.slug)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error || !data) {
        setPublicCatalogue(null);
        setPublicCatalogueStatus("error");
        setPublicCatalogueError(error?.message || "This catalogue may have expired or been archived.");
        return;
      }

      const normalized = toShareCatalogue(data);
      const expired = normalized.expiresAt && new Date(normalized.expiresAt) < new Date(new Date().toDateString());
      if (normalized.status !== "active" || expired) {
        setPublicCatalogue(null);
        setPublicCatalogueStatus("error");
        setPublicCatalogueError("This catalogue has expired or been archived.");
        return;
      }

      setPublicCatalogue(normalized);
      setPublicCatalogueStatus("ready");
    }

    loadPublicCatalogue();

    return () => {
      cancelled = true;
    };
  }, [routeIntent.slug, routeIntent.type, shareCatalogues]);

  const stats = useMemo(() => {
    return {
      totalProducts: products.filter((product) => !product.archivedAt).length,
      totalUnits: products.filter((product) => !product.archivedAt).reduce((sum, product) => sum + Number(product.quantity || 0), 0),
      lowStock: products.filter((product) => !product.archivedAt && product.stockStatus === "Low stock").length,
      withImages: products.filter((product) => !product.archivedAt && getProductImages(product).length).length
    };
  }, [products]);
  const todaysSalesSummary = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todaysSales = sales.filter((sale) => new Date(sale.createdAt) >= startOfDay);
    const paidSales = todaysSales.filter((sale) => sale.paymentStatus !== "pending");
    const pendingSales = todaysSales.filter((sale) => sale.paymentStatus === "pending");
    const collected = paidSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    const pendingTotal = pendingSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    const productCounts = new Map();
    todaysSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const key = item.productName || item.productSku;
        if (!key) {
          return;
        }
        productCounts.set(key, (productCounts.get(key) || 0) + Number(item.quantitySold || 0));
      });
    });
    const mostSold = Array.from(productCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None yet";
    return [
      { label: "Collected today", value: formatCurrency(collected), emphasis: collected > 0, tone: "success" },
      { label: "Pending today", value: formatCurrency(pendingTotal), tone: "warn" },
      { label: "Sales", value: todaysSales.length },
      { label: "Most sold", value: mostSold }
    ];
  }, [sales]);
  const purchaseSummaryItems = useMemo(() => {
    const totalPayable = purchases
      .filter((purchase) => !["received", "cancelled"].includes(purchase.status))
      .reduce((sum, purchase) => sum + Number(purchase.balanceDue || 0), 0);

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const dueSoon = purchases.filter((purchase) => {
      if (!purchase.expectedDeliveryDate || ["received", "cancelled"].includes(purchase.status)) {
        return false;
      }
      const deliveryDate = new Date(purchase.expectedDeliveryDate);
      return !Number.isNaN(deliveryDate.getTime()) && deliveryDate >= today && deliveryDate <= nextWeek;
    }).length;

    const inTransit = purchases.filter((purchase) => purchase.status === "in_transit").length;
    const received = purchases.filter((purchase) => purchase.status === "received").length;

    return [
      { label: "Total payable", value: formatCurrency(totalPayable), tone: "warn" },
      { label: "Due soon", value: dueSoon },
      { label: "In transit", value: inTransit },
      { label: "Received", value: received, tone: "success" }
    ];
  }, [purchases]);

  function populateForm(product) {
    setForm({
      id: product.id,
      name: product.name,
      category: product.category,
      material: product.material,
      quantity: product.quantity,
      mrp: product.pricing.mrp ?? "",
      costPrice: product.pricing.costPrice ?? product.pricing.unitCost ?? "",
      b2b: product.pricing.b2b ?? "",
      size: product.size ?? "",
      weight: product.weight ?? "",
      marketingTag: product.marketingTag ?? "",
      notes: product.notes ?? "",
      imageUrl: product.imageUrl ?? "",
      videoUrl: getProductVideos(product)[0] ?? ""
    });
  }

  function handleProductSelect(product) {
    const willClose = selectedId === product.id;
    if (!adminActive || previewCustomerView) {
      trackCustomerEvent("Product Viewed", {
        sku: product.sku,
        product: product.name,
        category: product.category,
        hasPrice: hasDisplayValue(product.pricing?.mrp)
      });
      trackCommerceEvent("view_item", {
        value: parsePrice(product.pricing?.mrp) || 0,
        items: [toCommerceItem(product)]
      });
      if (typeof window !== "undefined") {
        const nextPath = willClose
          ? getCustomerCollectionById(customerCollection).path
          : `/product/${product.slug}`;
        pushCustomerPath(nextPath);
      }
    }
    setSelectedId(willClose ? null : product.id);
    if (adminActive) {
      populateForm(product);
    }
  }

  function handleCustomerProductClose() {
    setSelectedId(null);
    if (customerFacing && typeof window !== "undefined") {
      const nextPath = getCustomerCollectionById(customerCollection).path;
      if (window.location.pathname !== nextPath) {
        pushCustomerPath(nextPath);
      }
    }
  }

  function handleEditProduct(product) {
    handleProductSelect(product);
    setActiveTab("add");
  }

  function handleNewInquiry() {
    setInquiryModalOpen(true);
    setInquiryModalStep("record");
    setInquiryTranscript("");
    setManualInquiryTranscript("");
    setInquiryDraft(createEmptyInquiryDraft());
    setInquiryModalError("");
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }

  function syncInquiryProductMatch(index, nextName) {
    const matched = findMatchingProduct(products, nextName);
    setInquiryDraft((current) => {
      const nextProducts = [...current.products];
      nextProducts[index] = {
        ...nextProducts[index],
        product_name: nextName,
        matched_sku: matched?.sku ?? ""
      };
      return { ...current, products: nextProducts };
    });
  }

  function updateInquiryProductField(index, field, value) {
    setInquiryDraft((current) => {
      const nextProducts = [...current.products];
      nextProducts[index] = { ...nextProducts[index], [field]: value };
      return { ...current, products: nextProducts };
    });
  }

  function addInquiryProductRow() {
    setInquiryDraft((current) => ({
      ...current,
      products: [...current.products, { product_name: "", matched_sku: "", quantity_requested: "", quoted_price: "" }]
    }));
  }

  function removeInquiryProductRow(index) {
    setInquiryDraft((current) => ({
      ...current,
      products:
        current.products.length > 1 ? current.products.filter((_, currentIndex) => currentIndex !== index) : current.products
    }));
  }

  function resetInquiryModal() {
    setInquiryModalOpen(false);
    setInquiryModalStep("record");
    setInquiryTranscript("");
    setManualInquiryTranscript("");
    setInquiryDraft(createEmptyInquiryDraft());
    setInquiryModalError("");
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }

  function resetSaleModal() {
    setSaleModalOpen(false);
    setSaleDraft(createEmptySaleDraft());
    setSaleProductSearch("");
    setSalePickerOpen(false);
    setSaleConfirmation(null);
    setSaleModalError("");
  }

  function handleOpenSaleModal() {
    setSaleModalOpen(true);
    setSaleDraft(createEmptySaleDraft());
    setSaleProductSearch("");
    setSalePickerOpen(false);
    setSaleConfirmation(null);
    setSaleModalError("");
  }

  function handleAddSaleProduct(product) {
    setSaleConfirmation(null);
    setSaleDraft((current) => {
      const existingIndex = current.items.findIndex((item) => item.product_sku === product.sku);
      if (existingIndex >= 0) {
        const nextItems = [...current.items];
        const nextQuantity = Math.min(Number(nextItems[existingIndex].quantity_sold || 0) + 1, Number(product.quantity || 0));
        nextItems[existingIndex] = { ...nextItems[existingIndex], quantity_sold: nextQuantity };
        return { ...current, items: nextItems };
      }

      return {
        ...current,
        items: [
          ...current.items,
          {
            product_id: product.id,
            product_sku: product.sku,
            product_name: product.name,
            quantity_sold: 0,
            selling_price: product.pricing.mrp ?? "",
            cost_price: product.pricing.costPrice ?? product.pricing.unitCost ?? "",
            max_quantity: Number(product.quantity || 0)
          }
        ]
      };
    });
    setSalePickerOpen(false);
    setSaleProductSearch("");
  }

  function handleUpdateSaleItem(index, field, value) {
    setSaleConfirmation(null);
    setSaleDraft((current) => {
      const nextItems = [...current.items];
      const currentItem = nextItems[index];
      if (!currentItem) {
        return current;
      }
      if (field === "quantity_sold") {
        if (value === "") {
          nextItems[index] = { ...currentItem, quantity_sold: 0 };
        } else {
          const nextQuantity = Math.max(1, Math.min(Number(value || 0), Number(currentItem.max_quantity || 1)));
          nextItems[index] = { ...currentItem, quantity_sold: nextQuantity };
        }
      } else {
        nextItems[index] = { ...currentItem, [field]: value };
      }
      return { ...current, items: nextItems };
    });
  }

  function handleRemoveSaleProduct(index) {
    setSaleConfirmation(null);
    setSaleDraft((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function buildSaleConfirmation() {
    if (!saleDraft.items.length) {
      setSaleModalError("Add at least one product before saving.");
      return null;
    }

    const inventoryChanges = saleDraft.items.map((item) => {
      const product = products.find((entry) => entry.sku === item.product_sku);
      return {
        item,
        product,
        nextQuantity: Math.max(0, Number(product?.quantity || 0) - Number(item.quantity_sold || 0))
      };
    });

    const invalidStock = inventoryChanges.find(
      ({ product, item }) =>
        !product ||
        Number(item.quantity_sold || 0) <= 0 ||
        Number(item.quantity_sold || 0) > Number(product.quantity || 0)
    );
    if (invalidStock) {
      setSaleModalError(`Stock is not available for ${invalidStock.item.product_name || invalidStock.item.product_sku}.`);
      return null;
    }

    const total = saleDraft.items.reduce(
      (sum, item) => sum + Number(item.quantity_sold || 0) * Number(item.selling_price || 0),
      0
    );

    return {
      inventoryChanges,
      total,
      paymentMethod: saleDraft.payment_method || "upi"
    };
  }

  function handleSaveSale() {
    setSaleModalError("");
    const confirmation = buildSaleConfirmation();
    if (!confirmation) {
      return;
    }
    setSaleConfirmation(confirmation);
  }

  async function handleConfirmSale() {
    try {
      const confirmation = saleConfirmation || buildSaleConfirmation();
      if (!confirmation) {
        return;
      }

      const { inventoryChanges, total } = confirmation;

      setSalesBusy(true);
      setSaleModalError("");
      if (isSupabaseConfigured && !session?.user) {
        throw new Error("Your admin session has expired. Please sign in again before recording the sale.");
      }
      const salePayload = {
        customer_name: safeText(saleDraft.customer_name) || null,
        payment_method: saleDraft.payment_method || "upi",
        payment_status: saleDraft.payment_status || "paid",
        notes: safeText(saleDraft.notes) || null,
        total_amount: total
      };

      let savedSale;
      if (isSupabaseConfigured) {
        const saleItemsPayload = saleDraft.items.map((item) => ({
          product_sku: item.product_sku,
          product_name: item.product_name,
          quantity_sold: Number(item.quantity_sold || 0),
          selling_price: Number(item.selling_price || 0),
          cost_price: item.cost_price === "" ? null : Number(item.cost_price)
        }));

        const { data: rpcData, error: rpcError } = await supabase.rpc("record_sale_with_items", {
          sale_payload: salePayload,
          sale_items_payload: saleItemsPayload
        });

        if (rpcError) {
          throw rpcError;
        }

        savedSale = saleFromRpcData(rpcData);
        if (!savedSale) {
          throw new Error("Sale was saved, but Supabase returned an unreadable response. Please refresh Sales before trying again.");
        }

        setProducts((current) =>
          current.map((product) => {
            const change = inventoryChanges.find(({ product: changedProduct }) => changedProduct.id === product.id);
            return change ? { ...product, quantity: change.nextQuantity } : product;
          })
        );
      } else {
        setProducts((current) =>
          current.map((product) => {
            const change = inventoryChanges.find(({ product: currentProduct }) => currentProduct.id === product.id);
            return change ? toProduct({ ...product, quantity: change.nextQuantity }) : product;
          })
        );
        savedSale = toSale({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...salePayload,
          sale_items: saleDraft.items.map((item) => ({
            id: crypto.randomUUID(),
            product_sku: item.product_sku,
            product_name: item.product_name,
            quantity_sold: item.quantity_sold,
            selling_price: item.selling_price,
            cost_price: item.cost_price === "" ? null : Number(item.cost_price)
          }))
        });
      }

      setSales((current) => [savedSale, ...current]);
      setExpandedSaleId(savedSale.id);
      setStatusMessage("Sale recorded ✓");
      setSaleConfirmation(null);
      resetSaleModal();
      setSalesBusy(false);
    } catch (error) {
      console.error("Sale error:", error);
      setSaleModalError(formatSaleSaveError(error));
      setSalesBusy(false);
    }
  }

  async function handleMarkSalePaid(sale) {
    if (!sale?.id || sale.paymentStatus !== "pending") {
      return;
    }

    try {
      setMarkingSalePaidId(sale.id);
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("sales")
          .update({ payment_status: "paid" })
          .eq("id", sale.id)
          .select("*, sale_items(*)")
          .single();
        if (error) {
          throw error;
        }
        const updatedSale = toSale(data);
        setSales((current) => current.map((entry) => (entry.id === updatedSale.id ? updatedSale : entry)));
      } else {
        setSales((current) =>
          current.map((entry) => (entry.id === sale.id ? { ...entry, paymentStatus: "paid" } : entry))
        );
      }
      setStatusMessage("Marked sale as paid ✓");
    } catch (error) {
      console.error("Mark sale paid failed:", error);
      setSaleModalError(error?.message || "Could not update this sale.");
    } finally {
      setMarkingSalePaidId("");
    }
  }

  async function handleDeleteSale(sale) {
    if (!sale?.id) {
      return;
    }

    const restoreLines = sale.items
      .map((item) => `• ${item.productName || item.productSku}: +${Number(item.quantitySold || 0)} stock`)
      .join("\n");
    const confirmed = window.confirm(
      `Delete this sale?\n\nThis will restore inventory:\n${restoreLines || "• No stock items recorded"}\n\nThis cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeletingSaleId(sale.id);
      if (isSupabaseConfigured) {
        const { error } = await supabase.rpc("delete_sale_and_restore_stock", {
          target_sale_id: sale.id
        });
        if (error) {
          throw error;
        }
      }

      setProducts((current) =>
        current.map((product) => {
          const restoredQuantity = sale.items
            .filter((item) => item.productSku === product.sku)
            .reduce((sum, item) => sum + Number(item.quantitySold || 0), 0);
          return restoredQuantity ? toProduct({ ...product, quantity: Number(product.quantity || 0) + restoredQuantity }) : product;
        })
      );
      setSales((current) => current.filter((entry) => entry.id !== sale.id));
      setExpandedSaleId((current) => (current === sale.id ? null : current));
      setStatusMessage("Sale deleted and stock restored ✓");
    } catch (error) {
      console.error("Delete sale failed:", error);
      const missingRpcMessage = "The sale delete function is not installed in Supabase yet. Please run the latest sales SQL migration, then try again.";
      setStatusMessage(isMissingDeleteSaleRpcError(error) ? missingRpcMessage : error?.message || "Could not delete this sale.");
    } finally {
      setDeletingSaleId("");
    }
  }

  function resetPurchaseModal() {
    setPurchaseModalOpen(false);
    setPurchaseDraft(createEmptyPurchaseDraft());
    setPurchaseProductSearch("");
    setPurchasePickerOpen(false);
    setPurchaseModalError("");
  }

  function handleOpenPurchaseModal() {
    setPurchaseModalOpen(true);
    setPurchaseDraft(createEmptyPurchaseDraft());
    setPurchaseProductSearch("");
    setPurchasePickerOpen(false);
    setPurchaseModalError("");
  }

  function handleAddPurchaseProduct(product) {
    if (!product) {
      setPurchaseDraft((current) => ({
        ...current,
        items: [...current.items, createPurchaseItemDraft()]
      }));
      return;
    }

    setPurchaseDraft((current) => {
      const existingIndex = current.items.findIndex((item) => item.product_sku === product.sku);
      if (existingIndex >= 0) {
        const nextItems = [...current.items];
        nextItems[existingIndex] = {
          ...nextItems[existingIndex],
          quantity_ordered: Number(nextItems[existingIndex].quantity_ordered || 0) + 1
        };
        return { ...current, items: nextItems };
      }

      return {
        ...current,
        items: [
          ...current.items,
          createPurchaseItemDraft({
            product_sku: product.sku,
            product_name: product.name,
            quantity_ordered: 0
          })
        ]
      };
    });
    setPurchasePickerOpen(false);
    setPurchaseProductSearch("");
  }

  function handleUpdatePurchaseItem(index, field, value) {
    setPurchaseDraft((current) => {
      const nextItems = [...current.items];
      const currentItem = nextItems[index];
      if (!currentItem) {
        return current;
      }
      nextItems[index] = { ...currentItem, [field]: field === "quantity_ordered" ? (value === "" ? "" : Number(value)) : value };
      return { ...current, items: nextItems };
    });
  }

  function handleRemovePurchaseProduct(index) {
    setPurchaseDraft((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function handlePurchaseReferenceImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadError("");
    setPurchaseModalError("");
    try {
      const fileToUpload = await prepareUploadFile(file);
      setPurchaseBusy(true);
      if (isSupabaseConfigured) {
        const path = buildPurchaseReferenceImagePath(purchaseDraft.vendor_name || "vendor", fileToUpload.name);
        const { error: storageError } = await supabase.storage.from(PRODUCT_STORAGE_BUCKET).upload(path, fileToUpload, { upsert: false });
        if (storageError) {
          throw storageError;
        }
        const { data } = supabase.storage.from(PRODUCT_STORAGE_BUCKET).getPublicUrl(path);
        setPurchaseDraft((current) => ({ ...current, reference_image_url: data.publicUrl }));
      } else {
        setPurchaseDraft((current) => ({ ...current, reference_image_url: URL.createObjectURL(fileToUpload) }));
      }
    } catch (error) {
      console.error("Purchase reference upload failed:", error);
      setPurchaseModalError(error?.message || "Could not upload this reference image.");
    } finally {
      setUploadStageMessage("");
      setPurchaseBusy(false);
      event.target.value = "";
    }
  }

  async function handleUpdatePurchaseStatus(purchase, nextStatus) {
    try {
      setUpdatingPurchaseStatusId(purchase.id);
      let updatedPurchase;

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("purchases")
          .update({ status: nextStatus })
          .eq("id", purchase.id)
          .select("*, purchase_items(*)")
          .single();

        if (error) {
          throw error;
        }

        updatedPurchase = toPurchase(data);
      } else {
        updatedPurchase = toPurchase({
          ...purchase,
          status: nextStatus,
          purchase_items: purchase.items.map((item) => ({
            id: item.id,
            product_sku: item.productSku,
            product_name: item.productName,
            quantity_ordered: item.quantityOrdered,
            cost_price: item.costPrice,
            line_total: item.lineTotal
          }))
        });
      }

      setPurchases((current) => current.map((entry) => (entry.id === purchase.id ? updatedPurchase : entry)));
      setStatusMessage(`Purchase marked as ${formatPurchaseStatus(nextStatus)} ✓`);
    } catch (error) {
      console.error("Purchase status update failed:", error);
      setStatusMessage(error?.message || "Could not update this purchase status.");
    } finally {
      setUpdatingPurchaseStatusId("");
    }
  }

  async function handleSavePurchase() {
    try {
      if (!purchaseDraft.vendor_name.trim()) {
        setPurchaseModalError("Add the vendor name before saving.");
        return;
      }

      if (!purchaseDraft.items.length) {
        setPurchaseModalError("Add at least one product before saving.");
        return;
      }

      const invalidItem = purchaseDraft.items.find(
        (item) => !safeText(item.product_name) || Number(item.quantity_ordered || 0) <= 0
      );
      if (invalidItem) {
        setPurchaseModalError("Each item needs a product name and quantity.");
        return;
      }

      const totalAmount = Number(purchaseDraft.total_amount || 0);
      const amountPaid = Number(purchaseDraft.amount_paid || 0);
      if (totalAmount <= 0) {
        setPurchaseModalError("Enter the total vendor bill amount.");
        return;
      }

      if (amountPaid > totalAmount) {
        setPurchaseModalError("Amount paid cannot be more than the total amount.");
        return;
      }

      setPurchaseBusy(true);
      setPurchaseModalError("");

      const balanceDue = Math.max(0, totalAmount - amountPaid);

      const purchasePayload = {
        vendor_name: safeText(purchaseDraft.vendor_name),
        vendor_phone: safeText(purchaseDraft.vendor_phone) || null,
        order_date: safeText(purchaseDraft.order_date) || null,
        expected_delivery_date: safeText(purchaseDraft.expected_delivery_date) || null,
        status: safeText(purchaseDraft.status, "planned"),
        total_amount: totalAmount,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        notes: safeText(purchaseDraft.notes) || null,
        reference_image_url: normalizeUrl(purchaseDraft.reference_image_url) || null
      };

      let savedPurchase;
      if (isSupabaseConfigured) {
        const { data: purchaseData, error: purchaseError } = await supabase.from("purchases").insert(purchasePayload).select().single();
        if (purchaseError) {
          throw purchaseError;
        }

        const itemsPayload = purchaseDraft.items.map((item) => ({
          purchase_id: purchaseData.id,
          product_sku: safeText(item.product_sku) || null,
          product_name: safeText(item.product_name),
          quantity_ordered: Number(item.quantity_ordered || 0),
          cost_price: null,
          line_total: null
        }));

        const { data: purchaseItemsData, error: itemsError } = await supabase.from("purchase_items").insert(itemsPayload).select();
        if (itemsError) {
          throw itemsError;
        }

        savedPurchase = toPurchase({ ...purchaseData, purchase_items: purchaseItemsData ?? [] });
      } else {
        savedPurchase = toPurchase({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...purchasePayload,
          purchase_items: purchaseDraft.items.map((item) => ({
            id: crypto.randomUUID(),
            product_sku: item.product_sku,
            product_name: item.product_name,
            quantity_ordered: item.quantity_ordered,
            cost_price: null,
            line_total: null
          }))
        });
      }

      setPurchases((current) => [savedPurchase, ...current]);
      setExpandedPurchaseId(savedPurchase.id);
      setStatusMessage("Purchase saved ✓");
      resetPurchaseModal();
    } catch (error) {
      console.error("Purchase save failed:", error);
      setPurchaseModalError(error?.message || "Could not save this purchase.");
    } finally {
      setPurchaseBusy(false);
    }
  }

  function showCompressionFeedback(originalFile, optimizedFile) {
    const nextMessage = `Polished: ${formatFileSize(originalFile.size)} → ${formatFileSize(optimizedFile.size)} catalogue image`;
    setCompressionMessage(nextMessage);
    if (compressionTimerRef.current) {
      window.clearTimeout(compressionTimerRef.current);
    }
    compressionTimerRef.current = window.setTimeout(() => {
      setCompressionMessage("");
    }, 2000);
  }

  async function prepareUploadFile(file) {
    const optimizedFile = await compressImage(file, 1200, 0.82, setUploadStageMessage);
    setUploadStageMessage("");
    showCompressionFeedback(file, optimizedFile);
    return optimizedFile;
  }

  async function prepareHeroSlideUploadFile(file) {
    const optimizedFile = await compressHeroSlideImage(file, 2000, 0.9, setUploadStageMessage);
    setUploadStageMessage("");
    showCompressionFeedback(file, optimizedFile);
    return optimizedFile;
  }

  async function handleHeroSlideImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!isSupabaseConfigured || !canManage) {
      setHeroSlideError("Sign in with Supabase before uploading slider images.");
      event.target.value = "";
      return;
    }

    setHeroSlideBusy(true);
    setHeroSlideError("");
    try {
      const fileToUpload = await prepareHeroSlideUploadFile(file);
      const path = buildHeroSlideImagePath(fileToUpload.name);
      const { error } = await supabase.storage.from(PRODUCT_STORAGE_BUCKET).upload(path, fileToUpload, { upsert: true });
      if (error) {
        throw error;
      }
      const { data } = supabase.storage.from(PRODUCT_STORAGE_BUCKET).getPublicUrl(path);
      setHeroSlideForm((current) => ({ ...current, imageUrl: data.publicUrl }));
      setStatusMessage("Slider image uploaded. Add the slide to publish it.");
    } catch (error) {
      const message = error?.message || "Could not upload slider image.";
      console.error("Hero slide upload failed:", error);
      setHeroSlideError(`Upload failed: ${message}`);
    } finally {
      setUploadStageMessage("");
      setHeroSlideBusy(false);
      event.target.value = "";
    }
  }

  async function handleSaveHeroSlide(event) {
    event.preventDefault();

    if (!isSupabaseConfigured || !canManage) {
      setHeroSlideError("Sign in with Supabase before publishing slider slides.");
      return;
    }

    if (!safeText(heroSlideForm.title)) {
      setHeroSlideError("Add a headline for this slide.");
      return;
    }

    setHeroSlideBusy(true);
    setHeroSlideError("");
    try {
      const payload = {
        eyebrow: safeText(heroSlideForm.eyebrow, "Decorbeats"),
        title: safeText(heroSlideForm.title),
        body: safeText(heroSlideForm.body),
        cta_label: safeText(heroSlideForm.ctaLabel, "Shop the Collection"),
        cta_action: safeText(heroSlideForm.ctaAction, "collection"),
        content_position: safeText(heroSlideForm.contentPosition, "left"),
        image_url: normalizeUrl(heroSlideForm.imageUrl),
        sort_order: Number.parseInt(heroSlideForm.sortOrder, 10) || heroSlides.length + 1,
        is_active: true
      };
      const { data, error } = await supabase.from("hero_slides").insert(payload).select().single();
      if (error) {
        throw error;
      }
      const normalized = toHeroSlide(data);
      setHeroSlides((current) => [...current, normalized].sort((left, right) => left.sortOrder - right.sortOrder));
      setHeroSlideForm(createEmptyHeroSlideForm());
      setStatusMessage("Credibility slide added ✓");
    } catch (error) {
      const message = error?.message || "Could not add the slide.";
      console.error("Hero slide save failed:", error);
      setHeroSlideError(
        message.includes("hero_slides") || message.includes("schema cache")
          ? "Hero slider table is missing. Run the SQL shown below, then try again."
          : message
      );
    } finally {
      setHeroSlideBusy(false);
    }
  }

  async function handleDeleteHeroSlide(slideId) {
    if (!isSupabaseConfigured || !canManage) {
      setHeroSlideError("Sign in with Supabase before changing slider slides.");
      return;
    }

    setHeroSlideBusy(true);
    setHeroSlideError("");
    try {
      const { error } = await supabase.from("hero_slides").update({ is_active: false }).eq("id", slideId);
      if (error) {
        throw error;
      }
      setHeroSlides((current) => current.filter((slide) => slide.id !== slideId));
      setStatusMessage("Slide removed from storefront.");
    } catch (error) {
      console.error("Hero slide delete failed:", error);
      setHeroSlideError(error?.message || "Could not remove this slide.");
    } finally {
      setHeroSlideBusy(false);
    }
  }

  async function handleMoveHeroSlide(slideId, direction) {
    if (!isSupabaseConfigured || !canManage) {
      setHeroSlideError("Sign in with Supabase before changing slider order.");
      return;
    }

    const orderedSlides = [...heroSlides].sort((left, right) => left.sortOrder - right.sortOrder);
    const currentIndex = orderedSlides.findIndex((slide) => slide.id === slideId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedSlides.length) {
      return;
    }

    const reorderedSlides = [...orderedSlides];
    [reorderedSlides[currentIndex], reorderedSlides[targetIndex]] = [reorderedSlides[targetIndex], reorderedSlides[currentIndex]];
    const normalizedSlides = reorderedSlides.map((slide, index) => ({ ...slide, sortOrder: index + 1 }));

    setHeroSlideBusy(true);
    setHeroSlideError("");
    try {
      await Promise.all(
        normalizedSlides.map((slide) =>
          supabase
            .from("hero_slides")
            .update({ sort_order: slide.sortOrder })
            .eq("id", slide.id)
            .then(({ error }) => {
              if (error) {
                throw error;
              }
            })
        )
      );
      setHeroSlides(normalizedSlides);
      setStatusMessage("Slider order updated ✓");
    } catch (error) {
      console.error("Hero slide reorder failed:", error);
      setHeroSlideError(error?.message || "Could not reorder slides.");
    } finally {
      setHeroSlideBusy(false);
    }
  }

  function resetCatalogueBuilder() {
    setCatalogueModalOpen(false);
    setCatalogueDraft(createEmptyCatalogueDraft());
    setCatalogueProductSearch("");
    setCataloguePickerOpen(false);
    setCatalogueError("");
  }

  function handleOpenCatalogueBuilder() {
    setCatalogueModalOpen(true);
    setCatalogueDraft(createEmptyCatalogueDraft());
    setCatalogueProductSearch("");
    setCataloguePickerOpen(false);
    setCatalogueError("");
  }

  function handleAddCatalogueProduct(product) {
    setCatalogueDraft((current) => {
      const existingIndex = current.items.findIndex((item) => item.product_sku === product.sku);
      if (existingIndex >= 0) {
        const nextItems = [...current.items];
        nextItems[existingIndex] = {
          ...nextItems[existingIndex],
          display_quantity: Math.max(1, Number(nextItems[existingIndex].display_quantity || 0) + 1)
        };
        return { ...current, items: nextItems };
      }

      return {
        ...current,
        title: current.title || `${product.category || "Decorbeats"} catalogue`,
        items: [...current.items, createCatalogueItemDraft(product)]
      };
    });
    setCataloguePickerOpen(false);
    setCatalogueProductSearch("");
  }

  function handleUpdateCatalogueItem(index, field, value) {
    setCatalogueDraft((current) => {
      const nextItems = [...current.items];
      const currentItem = nextItems[index];
      if (!currentItem) {
        return current;
      }
      nextItems[index] = {
        ...currentItem,
        [field]: ["display_quantity", "display_price"].includes(field) ? (value === "" ? "" : Number(value)) : value
      };
      return { ...current, items: nextItems };
    });
  }

  function handleRemoveCatalogueProduct(index) {
    setCatalogueDraft((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function copyShareCatalogueLink(catalogue) {
    const link = buildShareCatalogueUrl(catalogue.slug);
    try {
      await navigator.clipboard?.writeText(link);
      setStatusMessage("Catalogue link copied ✓");
    } catch {
      setStatusMessage(link);
    }
  }

  function handleOpenShareCatalogueLink(catalogue) {
    const link = buildShareCatalogueUrl(catalogue.slug);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  async function handleArchiveShareCatalogue(catalogue) {
    const confirmed = window.confirm("Archive this catalogue? The customer link will stop working.");
    if (!confirmed) {
      return;
    }

    setCatalogueBusy(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("share_catalogues")
          .update({ status: "archived", updated_at: new Date().toISOString() })
          .eq("id", catalogue.id)
          .select("*, share_catalogue_items(*)")
          .single();
        if (error) {
          throw error;
        }
        const updatedCatalogue = toShareCatalogue(data);
        setShareCatalogues((current) =>
          current.map((entry) => (entry.id === updatedCatalogue.id ? updatedCatalogue : entry))
        );
      } else {
        setShareCatalogues((current) =>
          current.map((entry) => (entry.id === catalogue.id ? { ...entry, status: "archived" } : entry))
        );
      }
      setStatusMessage("Catalogue archived.");
    } catch (error) {
      console.error("Catalogue archive failed:", error);
      setStatusMessage(error?.message || "Could not archive this catalogue.");
    } finally {
      setCatalogueBusy(false);
    }
  }

  async function handleSaveShareCatalogue() {
    const cleanTitle = safeText(catalogueDraft.title);
    if (!cleanTitle) {
      setCatalogueError("Add a catalogue title before sharing.");
      return;
    }
    if (!catalogueDraft.items.length) {
      setCatalogueError("Add at least one product before creating the catalogue.");
      return;
    }

    setCatalogueBusy(true);
    setCatalogueError("");
    try {
      const catalogueId = crypto.randomUUID();
      const nowIso = new Date().toISOString();
      const cataloguePayload = {
        id: catalogueId,
        title: cleanTitle,
        slug: buildShareCatalogueSlug(cleanTitle),
        created_at: nowIso,
        updated_at: nowIso,
        customer_name: safeText(catalogueDraft.customer_name) || null,
        occasion: safeText(catalogueDraft.occasion) || null,
        intro_note: safeText(catalogueDraft.intro_note) || null,
        status: "active",
        expires_at: safeText(catalogueDraft.expires_at) || null
      };

      let savedCatalogue;
      if (isSupabaseConfigured) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          throw new Error("Your admin session expired. Please sign in again, then create the catalogue.");
        }

        const { error: catalogueError } = await supabase
          .from("share_catalogues")
          .insert(cataloguePayload);
        if (catalogueError) {
          throw catalogueError;
        }

        const itemsPayload = catalogueDraft.items.map((item, index) => ({
          id: crypto.randomUUID(),
          catalogue_id: catalogueId,
          product_id: safeText(item.product_id) || null,
          product_sku: safeText(item.product_sku) || null,
          product_name: safeText(item.product_name),
          display_price: item.display_price === "" ? null : Number(item.display_price),
          display_quantity: item.display_quantity === "" ? null : Number(item.display_quantity),
          lead_time: safeText(item.lead_time, "Ready to ship"),
          customer_note: safeText(item.customer_note) || null,
          sort_order: index + 1
        }));

        const { error: itemError } = await supabase
          .from("share_catalogue_items")
          .insert(itemsPayload);
        if (itemError) {
          throw itemError;
        }

        savedCatalogue = toShareCatalogue({ ...cataloguePayload, share_catalogue_items: itemsPayload });
      } else {
        savedCatalogue = toShareCatalogue({
          ...cataloguePayload,
          share_catalogue_items: catalogueDraft.items.map((item, index) => ({
            id: crypto.randomUUID(),
            catalogue_id: catalogueId,
            product_id: item.product_id,
            product_sku: item.product_sku,
            product_name: item.product_name,
            display_price: item.display_price === "" ? null : Number(item.display_price),
            display_quantity: item.display_quantity === "" ? null : Number(item.display_quantity),
            lead_time: item.lead_time,
            customer_note: item.customer_note,
            sort_order: index + 1
          }))
        });
      }

      setShareCatalogues((current) => [savedCatalogue, ...current]);
      resetCatalogueBuilder();
      await copyShareCatalogueLink(savedCatalogue);
    } catch (error) {
      console.error("Catalogue save failed:", error);
      const message = error?.message || "Could not create this catalogue.";
      setCatalogueError(
        message.includes("share_catalogues") || message.includes("schema cache")
          ? "Catalogue tables are missing. Run the catalogue SQL migration in Supabase, then try again."
          : message.includes("Load failed") || error?.name === "TypeError"
            ? "Could not connect to Supabase to save this catalogue. Please confirm the catalogue SQL migration and RLS policies were run, then try again."
          : message
      );
    } finally {
      setCatalogueBusy(false);
    }
  }

  function startInquiryListening() {
    if (!speechSupported) {
      return;
    }

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }
      setInquiryTranscript(`${finalText} ${interimText}`.trim());
    };
    recognition.onerror = (event) => {
      console.log("Speech recognition failed:", event);
      setInquiryModalError("Voice capture stopped. You can continue by typing the inquiry.");
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setInquiryModalError("");
    setIsListening(true);
  }

  async function extractInquiryWithOpenAI(transcriptText) {
    const client = await getSupabaseClient();
    if (!client) {
      throw new Error("Admin services are not configured.");
    }
    const { data: sessionData } = await client.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error("Your admin session expired. Please sign in again.");
    }

    const response = await fetch("/api/extract-inquiry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        transcript: transcriptText
      })
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(errorPayload?.error?.message || "OpenAI request failed.");
    }

    const payload = await response.json();
    if (!payload?.inquiry) {
      throw new Error("OpenAI returned an empty response.");
    }
    return payload.inquiry;
  }

  async function processInquiryTranscript() {
    const rawTranscript = speechSupported ? inquiryTranscript.trim() : manualInquiryTranscript.trim();
    if (!rawTranscript) {
      setInquiryModalError("Add a transcript before continuing.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInquiryModalStep("extracting");
    setInquiryModalError("");

    try {
      const extracted = await extractInquiryWithOpenAI(rawTranscript);
      setInquiryDraft(normalizeInquiryDraft(extracted, products));
      setInquiryModalStep("confirm");
    } catch (error) {
      console.log("Inquiry extraction failed:", error);
      setInquiryModalError("Could not process automatically. Please fill in details manually.");
      setInquiryDraft(createEmptyInquiryDraft());
      setInquiryModalStep("confirm");
    }
  }

  async function saveInquiry() {
    const transcriptText = speechSupported ? inquiryTranscript.trim() : manualInquiryTranscript.trim();
    setInquiryBusy(true);
    setInquiryModalError("");
    try {
      const inquiryPayload = {
        customer_name: safeText(inquiryDraft.customer_name) || null,
        customer_phone: safeText(inquiryDraft.customer_phone) || null,
        source: safeText(inquiryDraft.source, "phone"),
        occasion: safeText(inquiryDraft.occasion) || null,
        required_by_date: safeText(inquiryDraft.required_by_date) || null,
        budget_per_unit: inquiryDraft.budget_per_unit === "" ? null : Number(inquiryDraft.budget_per_unit),
        total_budget: inquiryDraft.total_budget === "" ? null : Number(inquiryDraft.total_budget),
        notes: safeText(inquiryDraft.notes) || null,
        raw_transcript: transcriptText || null,
        status: "new"
      };

      let savedInquiry;
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("inquiries").insert(inquiryPayload).select().single();
        if (error) {
          throw error;
        }

        const itemsPayload = inquiryDraft.products
          .filter((item) => safeText(item.product_name))
          .map((item) => ({
            inquiry_id: data.id,
            product_sku: safeText(item.matched_sku) || null,
            product_name: safeText(item.product_name),
            quantity_requested: item.quantity_requested === "" ? null : Number(item.quantity_requested),
            quoted_price: item.quoted_price === "" ? null : Number(item.quoted_price)
          }));

        let items = [];
        if (itemsPayload.length) {
          const { data: insertedItems, error: itemsError } = await supabase.from("inquiry_items").insert(itemsPayload).select();
          if (itemsError) {
            throw itemsError;
          }
          items = insertedItems ?? [];
        }

        savedInquiry = toInquiry({ ...data, inquiry_items: items });
      } else {
        savedInquiry = toInquiry({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...inquiryPayload,
          inquiry_items: inquiryDraft.products
            .filter((item) => safeText(item.product_name))
            .map((item) => ({
              id: crypto.randomUUID(),
              product_sku: safeText(item.matched_sku) || null,
              product_name: safeText(item.product_name),
              quantity_requested: item.quantity_requested === "" ? null : Number(item.quantity_requested),
              quoted_price: item.quoted_price === "" ? null : Number(item.quoted_price)
            }))
        });
      }

      setInquiries((current) => [savedInquiry, ...current]);
      setExpandedInquiryId(savedInquiry.id);
      setStatusMessage("Inquiry saved ✓");
      resetInquiryModal();
    } catch (error) {
      console.log("Inquiry save failed:", error);
      setInquiryModalError(error?.message || "Could not save this inquiry.");
      setInquiryModalStep("confirm");
    } finally {
      setInquiryBusy(false);
    }
  }

  function handleScrollToCollection() {
    trackCustomerEvent("Shop Collection Clicked");
    productGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleFocusCustomerSearch() {
    trackCustomerEvent("Search Focused");
    customerSearchRef.current?.focus();
    customerSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleCustomerSearchBlur() {
    const query = search.trim();
    if (!query) {
      return;
    }
    trackCustomerEvent("Search Used", {
      query,
      resultCount: filteredProducts.length
    });
  }

  function handleCustomerCategorySelect(value, source = "category_bar") {
    const collection = getCustomerCollectionById(value);
    trackCustomerEvent("Collection Selected", { collection: collection.label, collectionId: collection.id, source });
    setCategoryFilter("All");
    setCustomerCollection(collection.id);
    if (customerFacing && typeof window !== "undefined") {
      const nextPath = collection.path;
      if (window.location.pathname !== nextPath) {
        pushCustomerPath(nextPath);
      }
    }
  }

  function handleCustomerWhatsAppClick(product) {
    trackCustomerEvent("Product WhatsApp Clicked", {
      sku: product.sku,
      product: product.name,
      category: product.category,
      hasPrice: hasDisplayValue(product.pricing?.mrp)
    });
    trackGoogleAdsContactConversion(product.pricing?.mrp);
  }

  async function handleDetailEdit(product, draft) {
    if (!canManage) {
      setStatusMessage("Sign in first to edit products.");
      return;
    }

    const payload = {
      name: draft.name,
      slug: slugify(`${product.sku}-${draft.name}`),
      quantity: Number(draft.quantity || 0),
      cost_price: draft.costPrice === "" ? null : Number(draft.costPrice),
      mrp: draft.mrp === "" ? null : Number(draft.mrp),
      b2b_price: draft.b2b === "" ? null : Number(draft.b2b),
      size: safeText(draft.size) || null,
      weight: safeText(draft.weight) || null,
      marketing_tag: safeText(draft.marketingTag),
      notes: draft.notes
    };

    setSaveBusy(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("products").update(payload).eq("id", product.id).select().single();
        if (error) {
          throw error;
        }
        const normalized = toProduct(data);
        setProducts((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
        setSelectedId(normalized.id);
        populateForm(normalized);
        setLastSyncAt(new Date().toISOString());
        setStatusMessage(`${normalized.name} updated.`);
      } else {
        setProducts((current) =>
          current.map((item) =>
            item.id === product.id
              ? toProduct({
                  ...item,
                  ...payload,
                  cost_price: payload.cost_price,
                  b2b_price: payload.b2b_price,
                  mrp: payload.mrp,
                  size: payload.size,
                  weight: payload.weight
                })
              : item
          )
        );
        setStatusMessage(`${draft.name} updated locally.`);
      }
      return true;
    } catch (error) {
      setStatusMessage(error.message || "Could not update this product.");
      return false;
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleShareProduct(product) {
    if (!adminActive || previewCustomerView) {
      trackCustomerEvent("Product Shared", {
        sku: product.sku,
        product: product.name,
        category: product.category
      });
    }
    const productUrl =
      typeof window === "undefined"
        ? `https://decorbeats.in/product/${product.slug}`
        : `${window.location.origin}/product/${product.slug}`;
    const message = [
      product.name,
      [product.material, product.category].filter(Boolean).join(" · "),
      hasDisplayValue(product.pricing?.mrp) ? formatCurrency(product.pricing.mrp) : "Ask Decorbeats for pricing",
      productUrl
    ]
      .filter(Boolean)
      .join("\n");
    const shareData = {
      title: product.name,
      text: message,
      url: productUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      }
      setStatusMessage(`${product.name} details ready to share.`);
    } catch (error) {
      if (error?.name !== "AbortError") {
        setStatusMessage("Could not share this product right now.");
      }
    }
  }

  async function handlePayOnline(product) {
    const price = parsePrice(product?.pricing?.mrp);
    if (!product || !price) {
      setPaymentMessage({ tone: "error", text: "Online payment is available only after an MRP is set for this product." });
      return;
    }

    setPaymentBusyProductId(product.id);
    setPaymentMessage({ tone: "info", text: "Opening secure Razorpay checkout..." });

    try {
      await loadRazorpayCheckout();

      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1
        })
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(order?.error || "Could not start payment");
      }

      await new Promise((resolve, reject) => {
        let settled = false;
        const rejectOnce = (error) => {
          if (settled) {
            return;
          }
          settled = true;
          reject(error);
        };
        const resolveOnce = (value) => {
          if (settled) {
            return;
          }
          settled = true;
          resolve(value);
        };
        const checkout = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "Decorbeats",
          description: `${product.name} (${product.sku})`,
          image: `${window.location.origin}${brandLogo}`,
          order_id: order.order_id,
          notes: {
            sku: product.sku,
            product_name: product.name
          },
          theme: {
            color: "#8B4A2A"
          },
          handler: async (paymentResponse) => {
            try {
              const verifyResponse = await fetch("/api/verify-payment", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(paymentResponse)
              });
              const verifyResult = await verifyResponse.json();
              if (!verifyResponse.ok || !verifyResult.verified) {
                throw new Error(verifyResult?.error || "Payment could not be verified");
              }
              resolveOnce(verifyResult);
            } catch (error) {
              rejectOnce(error);
            }
          },
          modal: {
            ondismiss: () => {
              const error = new Error("Payment cancelled");
              error.cancelled = true;
              rejectOnce(error);
            }
          }
        });

        checkout.on("payment.failed", (failureResponse) => {
          const paymentError = failureResponse?.error ?? {};
          const messageParts = [
            paymentError.description,
            paymentError.reason ? `Reason: ${paymentError.reason}` : null,
            paymentError.code ? `Code: ${paymentError.code}` : null,
            paymentError.step ? `Step: ${paymentError.step}` : null
          ].filter(Boolean);
          const error = new Error(messageParts.join(" · ") || "Payment failed in Razorpay Checkout");
          error.razorpay = paymentError;
          trackCustomerEvent("Razorpay Payment Failed", {
            sku: product.sku,
            product: product.name,
            code: paymentError.code,
            reason: paymentError.reason,
            step: paymentError.step
          });
          rejectOnce(error);
        });

        checkout.open();
      });

      trackCustomerEvent("Razorpay Payment Verified", {
        sku: product.sku,
        product: product.name,
        amount: price
      });
      trackGoogleAdsContactConversion(price);
      setPaymentMessage({
        tone: "success",
        text: "Payment successful. Please WhatsApp us your order details so we can confirm delivery."
      });
    } catch (error) {
      if (error?.cancelled) {
        setPaymentMessage({ tone: "info", text: "Payment was cancelled. You can try again whenever ready." });
      } else {
        console.error("Razorpay payment failed:", error);
        setPaymentMessage({ tone: "error", text: error.message || "Could not complete payment. Please try WhatsApp enquiry." });
      }
    } finally {
      setPaymentBusyProductId("");
    }
  }

  function handleAddToCart(product) {
    const price = parsePrice(product?.pricing?.mrp);
    if (!product || !price) {
      setPaymentMessage({ tone: "error", text: "Add an MRP before this product can be checked out online." });
      return;
    }
    if (Number(product.quantity || 0) <= 0) {
      setPaymentMessage({ tone: "error", text: `${product.name} is currently sold out. Ask us on WhatsApp about availability.` });
      return;
    }

    const lineId = getCartLineId(product);
    setCartBusyProductId(lineId);
    setCheckoutError("");
    setCheckoutSuccess("");
    setPaymentMessage({ tone: "success", text: `${product.name} added to cart.` });

    setCartItems((current) => {
      const existing = current.find((item) => String(item.productId) === lineId);
      const maxQuantity = Math.max(0, Number(product.quantity || 0));
      if (existing) {
        return current.map((item) =>
          String(item.productId) === lineId
            ? { ...item, quantity: Math.min(maxQuantity, Math.max(1, Number(item.quantity || 1) + 1)) }
            : item
        );
      }
      return [...current, { productId: product.id, quantity: 1 }];
    });

    trackCustomerEvent("Product Added To Cart", {
      sku: product.sku,
      product: product.name,
      amount: price
    });
    trackCommerceEvent("add_to_cart", {
      value: price,
      items: [toCommerceItem(product)]
    });

    if (selectedId != null) {
      handleCustomerProductClose();
    }
    setCartOpen(true);
    void loadRazorpayCheckout().catch(() => {
      // Checkout reports a useful error if the provider is unavailable at payment time.
    });
    window.setTimeout(() => setCartBusyProductId(""), 350);
  }

  function handleCartOpen() {
    setCartOpen(true);
    void loadRazorpayCheckout().catch(() => {
      // Keep browsing and cart editing available if the payment script cannot preload.
    });
  }

  function handleCartQuantityChange(productId, nextQuantity) {
    const product = products.find((entry) => String(entry.id) === String(productId));
    const maxQuantity = Math.max(0, Number(product?.quantity || 0));
    if (maxQuantity <= 0) {
      handleCartRemove(productId);
      return;
    }
    const quantity = Math.max(1, Math.min(Number(nextQuantity) || 1, maxQuantity));
    setCartItems((current) =>
      current.map((item) => (String(item.productId) === String(productId) ? { ...item, quantity } : item))
    );
  }

  function handleCartRemove(productId) {
    setCartItems((current) => current.filter((item) => String(item.productId) !== String(productId)));
  }

  async function handleCheckoutSubmit(event) {
    event.preventDefault();
    if (!cartLines.length) {
      setCheckoutError("Add at least one product before checkout.");
      return;
    }

    const requiredFields = [
      checkoutDetails.customerName,
      checkoutDetails.phone,
      checkoutDetails.addressLine1,
      checkoutDetails.city,
      checkoutDetails.state,
      checkoutDetails.pincode
    ];
    if (requiredFields.some((field) => !safeText(field))) {
      setCheckoutError("Please add name, phone and delivery address before payment.");
      return;
    }

    setCheckoutBusy(true);
    setCheckoutError("");
    setCheckoutSuccess("");
    trackCommerceEvent("begin_checkout", {
      value: cartLines.reduce((sum, line) => sum + line.lineTotal, 0),
      items: cartLines.map((line) => toCommerceItem(line.product, line.quantity))
    });

    try {
      await loadRazorpayCheckout();

      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: cartLines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity
          })),
          customer: checkoutDetails
        })
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(order?.error || "Could not start payment.");
      }

      const paymentResponse = await new Promise((resolve, reject) => {
        let settled = false;
        const rejectOnce = (error) => {
          if (settled) {
            return;
          }
          settled = true;
          reject(error);
        };
        const resolveOnce = (value) => {
          if (settled) {
            return;
          }
          settled = true;
          resolve(value);
        };

        const checkout = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "Decorbeats",
          description: `${cartLines.length} item${cartLines.length === 1 ? "" : "s"} from Decorbeats`,
          image: `${window.location.origin}${brandLogo}`,
          order_id: order.order_id,
          prefill: {
            name: checkoutDetails.customerName,
            email: checkoutDetails.email,
            contact: checkoutDetails.phone
          },
          notes: {
            customer_name: checkoutDetails.customerName,
            customer_phone: checkoutDetails.phone,
            item_count: String(cartLines.length)
          },
          theme: {
            color: "#8B4A2A"
          },
          handler: async (razorpayResponse) => {
            try {
              const verifyResponse = await fetch("/api/verify-payment", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  ...razorpayResponse,
                  customer: checkoutDetails,
                  items: (order.items?.length ? order.items : cartLines).map((item) => ({
                    productId: item.id ?? item.product?.id,
                    quantity: item.quantity
                  }))
                })
              });
              const verifyResult = await verifyResponse.json();
              if (!verifyResponse.ok || !verifyResult.verified) {
                throw new Error(verifyResult?.error || "Payment could not be verified.");
              }
              resolveOnce({ razorpayResponse, verifyResult });
            } catch (error) {
              rejectOnce(error);
            }
          },
          modal: {
            ondismiss: () => {
              const error = new Error("Payment cancelled.");
              error.cancelled = true;
              rejectOnce(error);
            }
          }
        });

        checkout.on("payment.failed", (failureResponse) => {
          const paymentError = failureResponse?.error ?? {};
          rejectOnce(new Error(paymentError.description || "Payment failed in Razorpay Checkout."));
        });

        checkout.open();
      });

      const totalAmount = Number(order.amount || 0) / 100;

      trackCustomerEvent("Customer Checkout Paid", {
        amount: totalAmount,
        itemCount: cartLines.length,
        orderReference: paymentResponse.verifyResult.orderReference
      });
      trackCommerceEvent("purchase", {
        transactionId: paymentResponse.verifyResult.orderReference,
        value: totalAmount,
        items: cartLines.map((line) => toCommerceItem(line.product, line.quantity))
      });
      setCheckoutSuccess(
        `Payment successful. Order reference: ${paymentResponse.verifyResult.orderReference}. We’ll confirm delivery shortly.`
      );
      setCartItems([]);
      setCheckoutDetails(createEmptyCheckoutDetails());
    } catch (error) {
      if (error?.cancelled) {
        setCheckoutError("Payment was cancelled. Your cart is still saved.");
      } else {
        console.error("Checkout failed:", error);
        setCheckoutError(error.message || "Could not complete checkout. Please try again.");
      }
    } finally {
      setCheckoutBusy(false);
    }
  }

  async function persistProductImages(product, nextImageUrls) {
    const cleaned = nextImageUrls.map(normalizeUrl).filter(Boolean);
    const primaryImage = cleaned[0] ?? null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from("products")
        .update({ image_urls: cleaned, image_url: primaryImage })
        .eq("id", product.id)
        .select()
        .single();
      if (error) {
        throw error;
      }
      const normalized = toProduct(data);
      setProducts((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
      setSelectedId(normalized.id);
      populateForm(normalized);
      setLastSyncAt(new Date().toISOString());
      return normalized;
    }

    const normalized = toProduct({
      ...product,
      image_urls: cleaned,
      image_url: primaryImage
    });
    setProducts((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
    return normalized;
  }

  async function persistProductVideos(product, nextVideoUrls) {
    const cleaned = nextVideoUrls.map(normalizeUrl).filter(Boolean);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from("products")
        .update({ video_urls: cleaned })
        .eq("id", product.id)
        .select()
        .single();
      if (error) {
        throw error;
      }
      const normalized = toProduct(data);
      setProducts((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
      setSelectedId(normalized.id);
      populateForm(normalized);
      setLastSyncAt(new Date().toISOString());
      return normalized;
    }

    const normalized = toProduct({
      ...product,
      video_urls: cleaned
    });
    setProducts((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
    return normalized;
  }

  async function handleAddDetailImages(product, files) {
    if (!canManage) {
      setStatusMessage("Sign in first to manage product photos.");
      return;
    }

    setUploadError("");
    try {
      if (isSupabaseConfigured) {
        const uploadedUrls = [];
        for (const file of files) {
          const fileToUpload = await prepareUploadFile(file);
          setUploadBusy(true);
          const path = buildProductImagePath(product.sku, fileToUpload.name);
          const { error: storageError } = await supabase.storage
            .from(PRODUCT_STORAGE_BUCKET)
            .upload(path, fileToUpload, { upsert: false });
          if (storageError) {
            throw storageError;
          }
          const { data: publicUrlData } = supabase.storage.from(PRODUCT_STORAGE_BUCKET).getPublicUrl(path);
          uploadedUrls.push(publicUrlData.publicUrl);
        }
        await persistProductImages(product, [...getProductImages(product), ...uploadedUrls]);
        setStatusMessage(uploadedUrls.length === 1 ? "Image added to gallery." : `${uploadedUrls.length} images added to gallery.`);
      } else {
        const localUrls = [];
        for (const file of files) {
          const fileToUpload = await prepareUploadFile(file);
          localUrls.push(URL.createObjectURL(fileToUpload));
        }
        await persistProductImages(product, [...getProductImages(product), ...localUrls]);
        setStatusMessage(localUrls.length === 1 ? "Image added locally." : `${localUrls.length} images added locally.`);
      }
    } catch (error) {
      console.log("Supabase upload failed:", error);
      const message = error?.message || "Could not update this gallery.";
      setUploadError(`Upload failed: ${message}`);
      setStatusMessage(`Upload failed: ${message}`);
    } finally {
      setUploadStageMessage("");
      setUploadBusy(false);
    }
  }

  async function handleDeleteDetailImage(product, imageUrlToRemove) {
    if (!canManage) {
      return;
    }

    const nextImages = getProductImages(product).filter((url) => url !== imageUrlToRemove);
    setUploadBusy(true);
    setUploadError("");
    try {
      await persistProductImages(product, nextImages);
      setStatusMessage("Image removed from gallery.");
    } catch (error) {
      setStatusMessage(error.message || "Could not remove this image.");
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleSetCoverImage(product, imageUrlToPromote) {
    if (!canManage) {
      return;
    }

    const images = getProductImages(product);
    const nextImages = [imageUrlToPromote, ...images.filter((url) => url !== imageUrlToPromote)];
    setUploadBusy(true);
    setUploadError("");
    try {
      await persistProductImages(product, nextImages);
      setStatusMessage("Cover image updated.");
    } catch (error) {
      setStatusMessage(error.message || "Could not update the cover image.");
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleAddDetailVideos(product, files) {
    if (!canManage) {
      setStatusMessage("Sign in first to manage product videos.");
      return;
    }

    setUploadError("");
    try {
      setUploadBusy(true);
      if (isSupabaseConfigured) {
        const uploadedUrls = [];
        for (const file of files) {
          setUploadStageMessage("Uploading product video...");
          const path = buildProductVideoPath(product.sku, file.name);
          const { error: storageError } = await supabase.storage
            .from(PRODUCT_STORAGE_BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type || "video/mp4" });
          if (storageError) {
            throw storageError;
          }
          const { data: publicUrlData } = supabase.storage.from(PRODUCT_STORAGE_BUCKET).getPublicUrl(path);
          uploadedUrls.push(publicUrlData.publicUrl);
        }
        await persistProductVideos(product, [...getProductVideos(product), ...uploadedUrls]);
        setStatusMessage(uploadedUrls.length === 1 ? "Video added to product." : `${uploadedUrls.length} videos added to product.`);
      } else {
        const localUrls = files.map((file) => URL.createObjectURL(file));
        await persistProductVideos(product, [...getProductVideos(product), ...localUrls]);
        setStatusMessage(localUrls.length === 1 ? "Video added locally." : `${localUrls.length} videos added locally.`);
      }
    } catch (error) {
      console.log("Supabase video upload failed:", error);
      const message = error?.message || "Could not upload this video.";
      setUploadError(`Video upload failed: ${message}`);
      setStatusMessage(`Video upload failed: ${message}`);
    } finally {
      setUploadStageMessage("");
      setUploadBusy(false);
    }
  }

  async function handleDeleteDetailVideo(product, videoUrlToRemove) {
    if (!canManage) {
      return;
    }

    setUploadBusy(true);
    setUploadError("");
    try {
      await persistProductVideos(
        product,
        getProductVideos(product).filter((url) => url !== videoUrlToRemove)
      );
      setStatusMessage("Video removed from product.");
    } catch (error) {
      setStatusMessage(error.message || "Could not remove this video.");
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleSignIn() {
    if (!isSupabaseConfigured || !authEmail || !authPassword) {
      return;
    }

    setAuthBusy(true);
    try {
      const client = await getSupabaseClient();
      if (!client) {
        throw new Error("Secure sign-in is temporarily unavailable.");
      }
      const { error } = await client.auth.signInWithPassword({
        email: authEmail,
        password: authPassword
      });
      if (error) {
        throw error;
      }
      setStatusMessage(`Signed in as ${authEmail}.`);
      setAuthPassword("");
    } catch (error) {
      setStatusMessage(error.message || "Could not sign in.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    if (!isSupabaseConfigured) {
      return;
    }
    const client = await getSupabaseClient();
    await client?.auth.signOut();
    setForm(emptyForm);
    setPublicScreen("customer");
    setSelectedId(null);
    setStatusMessage("Signed out. Customer browsing stays available, while editing is locked.");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canManage) {
      setStatusMessage("Sign in first to create or update products.");
      return;
    }

    setSaveBusy(true);

    const payload = {
      sku: generatedSku,
      slug: slugify(`${generatedSku}-${form.name}`),
      name: form.name,
      category: form.category || "Uncategorized",
      material: form.material || "Unspecified",
      quantity: Number(form.quantity || 0),
      cost_price: form.costPrice === "" ? null : Number(form.costPrice),
      mrp: form.mrp === "" ? null : Number(form.mrp),
      b2b_price: form.b2b === "" ? null : Number(form.b2b),
      size: safeText(form.size) || null,
      weight: safeText(form.weight) || null,
      marketing_tag: safeText(form.marketingTag),
      notes: form.notes,
      image_url: form.imageUrl,
      image_urls: normalizeUrl(form.imageUrl) ? [normalizeUrl(form.imageUrl)] : [],
      video_urls: normalizeUrl(form.videoUrl) ? [normalizeUrl(form.videoUrl)] : []
    };

    try {
      if (isSupabaseConfigured) {
        const query = form.id
          ? supabase
              .from("products")
              .update({ ...payload, sku: selectedProduct?.sku || generatedSku })
              .eq("id", form.id)
              .select()
              .single()
          : supabase.from("products").insert(payload).select().single();

        const { data, error } = await query;
        if (error) {
          throw error;
        }

        const normalized = toProduct(data);
        setProducts((current) => {
          const exists = current.some((product) => product.id === normalized.id);
          return exists ? current.map((product) => (product.id === normalized.id ? normalized : product)) : [normalized, ...current];
        });
        setSelectedId(normalized.id);
        setLastSyncAt(new Date().toISOString());
        setStatusMessage(form.id ? `${normalized.name} updated.` : "Product added ✓");
      } else {
        const normalized = toProduct({
          id: form.id || Date.now(),
          ...(form.id ? { ...payload, sku: selectedProduct?.sku || generatedSku } : payload)
        });
        setProducts((current) => {
          const exists = current.some((product) => product.id === normalized.id);
          return exists ? current.map((product) => (product.id === normalized.id ? normalized : product)) : [normalized, ...current];
        });
        setSelectedId(normalized.id);
        setStatusMessage(form.id ? `${normalized.name} updated locally.` : "Product added ✓");
      }

      setForm(emptyForm);
      if (!form.id) {
        setSelectedId(null);
      }
      setActiveTab("products");
    } catch (error) {
      setStatusMessage(error.message || "Could not save the product.");
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!isSupabaseConfigured) {
      setStatusMessage("Photo upload needs Supabase Storage configured.");
      return;
    }

    if (!canManage) {
      setStatusMessage("Sign in first to upload product photos.");
      return;
    }

    setUploadError("");
    try {
      const fileToUpload = await prepareUploadFile(file);
      setUploadBusy(true);
      const path = buildProductImagePath(generatedSku || "draft", fileToUpload.name);
      const { error: storageError } = await supabase.storage
        .from(PRODUCT_STORAGE_BUCKET)
        .upload(path, fileToUpload, { upsert: true });
      if (storageError) {
        throw storageError;
      }

      const { data } = supabase.storage.from(PRODUCT_STORAGE_BUCKET).getPublicUrl(path);
      setForm((current) => ({ ...current, imageUrl: data.publicUrl }));
      setStatusMessage("Image uploaded. Save the product to store it.");
    } catch (error) {
      console.log("Supabase upload failed:", error);
      const message = error?.message || "Image upload failed.";
      setUploadError(`Upload failed: ${message}`);
      setStatusMessage(`Upload failed: ${message}`);
    } finally {
      setUploadStageMessage("");
      setUploadBusy(false);
      event.target.value = "";
    }
  }

  async function handleCsvImport(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!isSupabaseConfigured) {
      setStatusMessage("CSV import needs Supabase configured.");
      return;
    }

    if (!canManage) {
      setStatusMessage("Sign in first to import inventory.");
      return;
    }

    setImportBusy(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const mappedRows = rows.map(mapSettingsCsvRowToPayload).filter(Boolean);
      const { rows: payload, duplicates } = dedupePayloadBySku(mappedRows);

      if (!payload.length) {
        setStatusMessage("No usable inventory rows were found in that CSV.");
        return;
      }
      setCsvPreviewPayload(payload);
      setCsvPreviewRows(payload.slice(0, 5));
      setCsvPreviewFileName(file.name);
      setStatusMessage(
        duplicates
          ? `Preview ready. ${payload.length} unique SKU rows found and ${duplicates} duplicate row(s) were merged.`
          : `Preview ready for ${payload.length} rows from ${file.name}.`
      );
    } catch (error) {
      setStatusMessage(error.message || "CSV import failed.");
    } finally {
      setImportBusy(false);
      event.target.value = "";
    }
  }

  async function handleConfirmCsvImport() {
    if (!csvPreviewPayload.length) {
      return;
    }

    setImportBusy(true);
    try {
      const { error } = await supabase.from("products").upsert(csvPreviewPayload, { onConflict: "sku" });
      if (error) {
        throw error;
      }

      const { data: refreshed, error: refreshError } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (refreshError) {
        throw refreshError;
      }

      const normalized = (refreshed ?? []).map(toProduct);
      setProducts(normalized);
      setSelectedId(null);
      setLastSyncAt(new Date().toISOString());
      setStatusMessage(`Imported ${csvPreviewPayload.length} rows from ${csvPreviewFileName}.`);
      setCsvPreviewPayload([]);
      setCsvPreviewRows([]);
      setCsvPreviewFileName("");
    } catch (error) {
      setStatusMessage(error.message || "CSV import failed.");
    } finally {
      setImportBusy(false);
    }
  }

  function handleClearCsvPreview() {
    setCsvPreviewPayload([]);
    setCsvPreviewRows([]);
    setCsvPreviewFileName("");
    setStatusMessage("CSV preview cleared.");
  }

  async function handleArchiveToggle(product, archived) {
    if (!canManage) {
      setStatusMessage("Sign in first to archive or restore products.");
      return;
    }

    setArchiveBusy(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("products")
          .update({ archived_at: archived ? new Date().toISOString() : null })
          .eq("id", product.id)
          .select()
          .single();
        if (error) {
          throw error;
        }

        const normalized = toProduct(data);
        setProducts((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
        setSelectedId(normalized.id);
        setLastSyncAt(new Date().toISOString());
        setStatusMessage(archived ? `${product.name} archived.` : `${product.name} restored.`);
      } else {
        setProducts((current) =>
          current.map((item) =>
            item.id === product.id ? { ...item, archivedAt: archived ? new Date().toISOString() : null } : item
          )
        );
        setStatusMessage(archived ? `${product.name} archived locally.` : `${product.name} restored locally.`);
      }
    } catch (error) {
      setStatusMessage(error.message || "Could not update archive status.");
    } finally {
      setArchiveBusy(false);
    }
  }

  async function handlePinToggle(product, pinned) {
    setArchiveBusy(true);
    setUploadError("");

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("products")
          .update({ pinned })
          .eq("id", product.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        const nextProduct = toProduct(data);
        setProducts((current) => current.map((item) => (item.id === nextProduct.id ? nextProduct : item)));
      } else {
        setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, pinned } : item)));
      }

      setStatusMessage(pinned ? `${product.name} pinned to the top of customer view.` : `${product.name} unpinned.`);
    } catch (error) {
      console.log("Pin toggle failed:", error);
      setUploadError(error?.message || "Pin status could not be updated right now.");
    } finally {
      setArchiveBusy(false);
    }
  }

  async function handleInquiryStatusUpdate(inquiry, nextStatus) {
    setInquiryBusy(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("inquiries")
          .update({ status: nextStatus })
          .eq("id", inquiry.id)
          .select("*, inquiry_items(*)")
          .single();
        if (error) {
          throw error;
        }
        const normalized = toInquiry(data);
        setInquiries((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
      } else {
        setInquiries((current) => current.map((item) => (item.id === inquiry.id ? { ...item, status: nextStatus } : item)));
      }
      setStatusMessage(`${inquiry.customerName} moved to ${formatInquiryStatus(nextStatus)}.`);
    } catch (error) {
      setStatusMessage(error.message || "Could not update inquiry status.");
    } finally {
      setInquiryBusy(false);
    }
  }

  useEffect(() => {
    setCategoryFilter("All");
    setCustomerCollection("all");
    setSearch("");
  }, [activeTab, publicScreen]);

  useEffect(() => {
    if (activeTab === "inquiries") {
      setActiveTab("products");
    }
  }, [activeTab]);

  const statsItems = [
    { label: "Products", value: stats.totalProducts },
    { label: "Units", value: stats.totalUnits },
    { label: "Low stock", value: stats.lowStock, emphasis: stats.lowStock > 0 },
    { label: "With photos", value: stats.withImages }
  ];

  const lastSyncLabel = lastSyncAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(lastSyncAt))
    : "Not synced yet";

  const featuredCustomerProduct = customerCatalog.find((product) => getProductImages(product).length) || customerCatalog[0] || null;
  const activeCustomerCollection = getCustomerCollectionById(customerCollection);
  const generatedSku = form.id ? selectedProduct?.sku || "" : getNextSku(products, form.material, form.category);
  const activeTicker = TICKER_MESSAGES[headerTickerIndex];
  const adminTitle =
    activeTab === "products"
      ? "Products"
      : activeTab === "inquiries"
        ? "Inquiries"
        : activeTab === "sales"
          ? "Sales"
          : activeTab === "purchases"
            ? "Purchases"
            : activeTab === "catalogues"
              ? "Catalogues"
            : activeTab === "add"
              ? "Add or edit"
              : activeTab === "low-stock"
                ? "Low stock"
                : "Settings";
  const adminSubtitle =
    activeTab === "products"
      ? "Browse and edit the full catalog."
      : activeTab === "inquiries"
        ? "Track customer requests, quotes, and conversions."
        : activeTab === "sales"
          ? "Record completed orders, watch today’s numbers, and keep stock accurate."
          : activeTab === "purchases"
            ? "Track vendor orders, payments, and expected delivery dates."
            : activeTab === "catalogues"
              ? "Create curated customer links with selected products, lead time, and pricing."
            : activeTab === "add"
              ? "Create products, update details, and add imagery."
              : activeTab === "low-stock"
                ? "Focus on products that need replenishment."
                : "Import stock, manage archive visibility, and control access.";

  function handleTickerAction(action) {
    if (action === "collection") {
      if (activeTicker.text.includes("VARALAKSHMI")) {
        handleCustomerCategorySelect("varalakshmi", "campaign_ticker");
      }
      handleScrollToCollection();
      return;
    }
    if (action === "whatsapp") {
      openBulkWhatsApp();
    }
  }

  function handleAdminEntry() {
    trackCustomerEvent("Admin Link Clicked");
    void getSupabaseClient();
    setPublicScreen("admin-auth");
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/admin");
    }
  }

  function handleCustomerHome() {
    setPublicScreen("customer");
    setCategoryFilter("All");
    setCustomerCollection("all");
    setSearch("");
    setSelectedId(null);
    setRouteIntent({ screen: "customer", type: "home", slug: "" });
    pendingRouteIntentRef.current = { screen: "customer", type: "home", slug: "" };
    if (typeof window !== "undefined") {
      pushCustomerPath("/");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!authReady && publicScreen === "admin-auth") {
    return (
      <div className="app-shell">
        <div className="screen-shell">
          <StatusStrip statusMessage="Restoring your session..." />
        </div>
      </div>
    );
  }

  const rootElement = publicScreen === "catalogue" ? (
    <ShareCataloguePage
      catalogue={publicCatalogue}
      products={products}
      status={publicCatalogueStatus}
      error={publicCatalogueError}
      onHome={handleCustomerHome}
    />
  ) : !adminActive && publicScreen === "admin-auth" ? (
    <div className="app-shell">
      <div className="screen-shell">
        <ScreenHeader
          eyebrow="Decorbeats"
          title="Admin sign in"
          subtitle="Sign in with your admin email and password to unlock inventory management."
          action={
            <button type="button" className="ghost-button" onClick={() => setPublicScreen("customer")}>
              Back
            </button>
          }
        />
        <StatusStrip statusMessage={statusMessage} />
        <AuthPanel
          email={authEmail}
          setEmail={setAuthEmail}
          password={authPassword}
          setPassword={setAuthPassword}
          authBusy={authBusy}
          userEmail={userEmail}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />
      </div>
    </div>
  ) : !adminActive || previewCustomerView ? (
    <div className="customer-page customer-shell">
      <AnnouncementBar
        onShop={() => {
          handleCustomerCategorySelect("varalakshmi", "announcement");
          handleScrollToCollection();
        }}
      />
      <CustomerUtilityBar />
      <CustomerHeader
        scrolled={customerHeaderElevated}
        tickerMessage={activeTicker.text}
        tickerAction={activeTicker.action}
        tickerVisible={headerTickerVisible}
        onSearchTap={handleFocusCustomerSearch}
        onTickerAction={handleTickerAction}
        onAdmin={handleAdminEntry}
        onHome={handleCustomerHome}
        cartCount={cartCount}
        onCartOpen={handleCartOpen}
      />
      <CustomerNavigation
        onSelectCategory={handleCustomerCategorySelect}
        onShop={handleScrollToCollection}
      />
      <main className="customer-main">
        {adminActive && previewCustomerView ? <CustomerPreviewBanner onBack={() => {
          setPreviewCustomerView(false);
          setActiveTab("products");
        }} /> : null}
        <CustomerHero
          slides={heroSlides}
          featuredProduct={featuredCustomerProduct}
          onShop={handleScrollToCollection}
          onSelectCategory={handleCustomerCategorySelect}
        />
        <CustomerCommercePromise />
        {customerCollection === "all" || customerCollection === "varalakshmi" ? (
          <CustomerCampaignEdit
            products={customerCatalog}
            onSelect={handleProductSelect}
            onAddToCart={handleAddToCart}
            busyProductId={cartBusyProductId}
            onViewAll={() => {
              handleCustomerCategorySelect("varalakshmi", "campaign_edit");
              handleScrollToCollection();
            }}
          />
        ) : null}
        <section className="customer-catalog-shell" ref={productGridRef} aria-labelledby="brass-edit-title">
          <div className="customer-collections-head desktop-reveal">
            <div>
              <p className="eyebrow">
                {activeCustomerCollection.id === "all" ? "Curated by brass specialists" : "Your selected brass collection"}
              </p>
              <h2 id="brass-edit-title">
                {activeCustomerCollection.id === "all" ? "The Decorbeats Brass Edit" : activeCustomerCollection.label}
              </h2>
              <p>
                {activeCustomerCollection.id === "all"
                  ? "Pieces with presence—for rituals, rooms, tables and gifts worth remembering."
                  : "A focused edit of available pieces, with material and pricing shown clearly."}
              </p>
            </div>
            <span>{filteredProducts.length} pieces</span>
          </div>
          <div className="customer-filter-bar">
            <CustomerCategoryBar
              collectionFilter={customerCollection}
              setCollectionFilter={handleCustomerCategorySelect}
            />
            <div className="customer-search-row">
              <input
                ref={customerSearchRef}
                className="customer-search-input"
                type="search"
                placeholder="Search the collection"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onBlur={handleCustomerSearchBlur}
              />
            </div>
          </div>
          <section className="customer-product-grid">
            {visibleCustomerProducts.map((product) => (
              <CustomerProductCard
                key={product.id}
                product={product}
                onSelect={handleProductSelect}
                onAddToCart={handleAddToCart}
                busy={String(cartBusyProductId) === String(product.id)}
              />
            ))}
          </section>
          {storefrontLoading ? <CustomerProductSkeletonGrid /> : null}
          {!storefrontLoading && !visibleCustomerProducts.length ? (
            <CustomerEmptyCollection
              onClear={() => {
                setSearch("");
                handleCustomerCategorySelect("all", "empty_state");
              }}
            />
          ) : null}
          {visibleCustomerProductCount < filteredProducts.length ? (
            <div className="customer-load-more-wrap">
              <button
                type="button"
                className="customer-load-more"
                onClick={() => setVisibleCustomerProductCount((current) => current + 12)}
              >
                Discover more pieces
              </button>
              <span>
                Showing {visibleCustomerProducts.length} of {filteredProducts.length}
              </span>
            </div>
          ) : null}
        </section>
        <BrandAuthorityIntro productCount={stats.totalProducts} onShop={handleScrollToCollection} />
        <CustomerOccasionRail products={customerCatalog} onSelectCategory={handleCustomerCategorySelect} onShop={handleScrollToCollection} />
        <EditorialSection onShop={handleScrollToCollection} />
        <CorporateGiftingSection />
        <KnowYourBrass />
        <CustomerFaq />
        <CustomerFooter onAdmin={handleAdminEntry} showAdminLink={false} />
      </main>
      {!selectedProduct && !cartOpen ? (
        <CustomerMobileDock cartCount={cartCount} onShop={handleScrollToCollection} onCartOpen={handleCartOpen} />
      ) : null}
      <CustomerSheet
        product={selectedProduct}
        onClose={handleCustomerProductClose}
        onShare={handleShareProduct}
        onWhatsApp={handleCustomerWhatsAppClick}
        onAddToCart={handleAddToCart}
        cartBusyProductId={cartBusyProductId}
        paymentMessage={paymentMessage}
      />
      <CustomerCartDrawer
        open={cartOpen}
        items={cartLines}
        details={checkoutDetails}
        setDetails={setCheckoutDetails}
        busy={checkoutBusy}
        error={checkoutError}
        success={checkoutSuccess}
        onClose={() => setCartOpen(false)}
        onQuantityChange={handleCartQuantityChange}
        onRemove={handleCartRemove}
        onCheckout={handleCheckoutSubmit}
      />
    </div>
  ) : (
    <div className="app-shell app-shell-admin">
      <div className="screen-shell admin-shell">
        <ScreenHeader
          eyebrow="Decorbeats Admin"
          title={adminTitle}
          subtitle={adminSubtitle}
          action={<div className="user-badge">{userEmail ? `Signed in: ${userEmail}` : "Local admin mode"}</div>}
        />

        {activeTab === "products" ? (
          <>
            <div className="admin-action-row">
              <button type="button" className="primary-button quick-add-button" onClick={() => setActiveTab("add")}>
                Add Product
              </button>
              <button type="button" className="ghost-button quick-add-button" onClick={() => setActiveTab("catalogues")}>
                Create Catalogue
              </button>
            </div>
            <StatusStrip statusMessage={statusMessage} />
            <StatStrip items={statsItems} />
            <CatalogSection
              products={filteredProducts}
              customerMode={false}
              selectedId={selectedId}
              canManage={canManage}
              onSelect={handleProductSelect}
              onEdit={handleEditProduct}
              onShare={handleShareProduct}
              onArchiveToggle={handleArchiveToggle}
              onPinToggle={handlePinToggle}
              onInlineEdit={handleDetailEdit}
              onInlineAddImages={handleAddDetailImages}
              onInlineDeleteImage={handleDeleteDetailImage}
              onInlineSetCoverImage={handleSetCoverImage}
              onInlineAddVideos={handleAddDetailVideos}
              onInlineDeleteVideo={handleDeleteDetailVideo}
              imageBusy={uploadBusy}
              uploadError={uploadError}
              compressionMessage={compressionMessage}
              uploadStageMessage={uploadStageMessage}
              saveBusy={saveBusy}
              search={search}
              setSearch={setSearch}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              categories={categories}
              archivedVisible={showArchived}
            />
          </>
        ) : null}

        {activeTab === "inquiries" ? (
          <>
            <StatusStrip statusMessage={statusMessage} />
            <InquiriesScreen
              inquiries={filteredInquiries}
              statusFilter={inquiryStatusFilter}
              setStatusFilter={setInquiryStatusFilter}
              expandedInquiryId={expandedInquiryId}
              onToggleInquiry={(id) => setExpandedInquiryId((current) => (current === id ? null : id))}
              onStatusUpdate={handleInquiryStatusUpdate}
              onNewInquiry={handleNewInquiry}
              busy={inquiryBusy}
            />
          </>
        ) : null}

        {activeTab === "sales" ? (
          <>
            <StatusStrip statusMessage={statusMessage} />
            <SalesScreen
              sales={filteredSales}
              summaryItems={todaysSalesSummary}
              onRecordSale={handleOpenSaleModal}
              expandedSaleId={expandedSaleId}
              onToggleSale={(saleId) => setExpandedSaleId((current) => (current === saleId ? null : saleId))}
              paymentFilter={salePaymentStatusFilter}
              setPaymentFilter={setSalePaymentStatusFilter}
              onMarkAsPaid={handleMarkSalePaid}
              onDeleteSale={handleDeleteSale}
              markingPaidId={markingSalePaidId}
              deletingSaleId={deletingSaleId}
            />
          </>
        ) : null}

        {activeTab === "purchases" ? (
          <>
            <StatusStrip statusMessage={statusMessage} />
            <PurchasesScreen
              purchases={filteredPurchases}
              summaryItems={purchaseSummaryItems}
              onAddPurchase={handleOpenPurchaseModal}
              expandedPurchaseId={expandedPurchaseId}
              onTogglePurchase={(purchaseId) => setExpandedPurchaseId((current) => (current === purchaseId ? null : purchaseId))}
              statusFilter={purchaseStatusFilter}
              setStatusFilter={setPurchaseStatusFilter}
              onUpdatePurchaseStatus={handleUpdatePurchaseStatus}
              updatingPurchaseStatusId={updatingPurchaseStatusId}
            />
          </>
        ) : null}

        {activeTab === "catalogues" ? (
          <ShareCataloguesScreen
            catalogues={shareCatalogues}
            onCreate={handleOpenCatalogueBuilder}
            onCopyLink={copyShareCatalogueLink}
            onOpenLink={handleOpenShareCatalogueLink}
            onArchive={handleArchiveShareCatalogue}
            busy={catalogueBusy}
          />
        ) : null}

        {activeTab === "add" ? (
          <section className="stack-grid">
            <StatusStrip statusMessage={statusMessage} />
            <ProductForm
              form={form}
              setForm={setForm}
              generatedSku={generatedSku}
              onSubmit={handleSubmit}
              onReset={() => setForm(emptyForm)}
              uploadBusy={uploadBusy}
              saveBusy={saveBusy}
              compressionMessage={compressionMessage}
              uploadStageMessage={uploadStageMessage}
              onFileChange={handleFileChange}
            />
            <ArchivePanel
              product={selectedProduct}
              archiveBusy={archiveBusy}
              onArchive={(product) => handleArchiveToggle(product, true)}
              onRestore={(product) => handleArchiveToggle(product, false)}
            />
            <DetailPanel
              product={selectedProduct}
              customerMode={false}
              canManage={canManage}
              onEdit={handleDetailEdit}
              onShare={handleShareProduct}
              onAddImages={handleAddDetailImages}
              onDeleteImage={handleDeleteDetailImage}
              onSetCoverImage={handleSetCoverImage}
              onAddVideos={handleAddDetailVideos}
              onDeleteVideo={handleDeleteDetailVideo}
              imageBusy={uploadBusy}
              uploadError={uploadError}
              compressionMessage={compressionMessage}
              uploadStageMessage={uploadStageMessage}
              saveBusy={saveBusy}
            />
          </section>
        ) : null}

        {activeTab === "low-stock" ? (
          <>
            <StatusStrip
              statusMessage={statusMessage}
              items={[
                { label: "Low stock items", value: lowStockCatalog.filter((product) => !product.archivedAt || showArchived).length },
                { label: "Archived shown", value: showArchived ? "Yes" : "No" }
              ]}
            />
            <CatalogSection
              products={filteredProducts}
              customerMode={false}
              selectedId={selectedId}
              canManage={canManage}
              onSelect={handleProductSelect}
              onEdit={handleEditProduct}
              onShare={handleShareProduct}
              onArchiveToggle={handleArchiveToggle}
              onPinToggle={handlePinToggle}
              onInlineEdit={handleDetailEdit}
              onInlineAddImages={handleAddDetailImages}
              onInlineDeleteImage={handleDeleteDetailImage}
              onInlineSetCoverImage={handleSetCoverImage}
              onInlineAddVideos={handleAddDetailVideos}
              onInlineDeleteVideo={handleDeleteDetailVideo}
              imageBusy={uploadBusy}
              uploadError={uploadError}
              compressionMessage={compressionMessage}
              uploadStageMessage={uploadStageMessage}
              saveBusy={saveBusy}
              search={search}
              setSearch={setSearch}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              categories={categories}
              archivedVisible={showArchived}
            />
          </>
        ) : null}

        {activeTab === "settings" ? (
          <section className="stack-grid">
            <StatusStrip statusMessage={statusMessage} />
            <section className="panel-card admin-card settings-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Catalog</p>
                  <h3>Add Product</h3>
                </div>
              </div>
              <p className="support-copy">Jump into the product editor to create a new SKU or update an existing one.</p>
              <button type="button" className="primary-button settings-button" onClick={() => setActiveTab("add")}>
                Open Product Studio
              </button>
            </section>
            <ImportPanel
              importBusy={importBusy}
              previewRows={csvPreviewRows}
              previewFileName={csvPreviewFileName}
              previewCount={csvPreviewPayload.length}
              onFileChange={handleCsvImport}
              onConfirm={handleConfirmCsvImport}
              onClearPreview={handleClearCsvPreview}
            />
            <HeroSlideSettingsPanel
              slides={heroSlides}
              form={heroSlideForm}
              setForm={setHeroSlideForm}
              busy={heroSlideBusy}
              error={heroSlideError}
              uploadStageMessage={uploadStageMessage}
              compressionMessage={compressionMessage}
              onImageChange={handleHeroSlideImageUpload}
              onSubmit={handleSaveHeroSlide}
              onDelete={handleDeleteHeroSlide}
              onMove={handleMoveHeroSlide}
            />
            <section className="panel-card admin-card settings-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Customer sharing</p>
                  <h3>Curated Catalogues</h3>
                </div>
              </div>
              <p className="support-copy">
                Create a private link with selected products, custom quantities, prices, and lead time for WhatsApp customers.
              </p>
              <button type="button" className="ghost-button settings-button" onClick={() => setActiveTab("catalogues")}>
                Open Catalogues
              </button>
            </section>
            <AccountCard userEmail={userEmail} onSignOut={handleSignOut} />
            <section className="panel-card admin-card settings-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Preview</p>
                  <h3>Customer View</h3>
                </div>
              </div>
              <p className="support-copy">See the storefront exactly as a customer sees it without signing out.</p>
              <button
                type="button"
                className="ghost-button settings-button"
                onClick={() => {
                  setPreviewCustomerView(true);
                  setSelectedId(null);
                }}
              >
                Customer View
              </button>
            </section>
            <AppInfoCard lastSyncLabel={lastSyncLabel} />
          </section>
        ) : null}
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} lowStockCount={stats.lowStock} />
      <InquiryRecorderModal
        open={inquiryModalOpen}
        supportsSpeechRecognition={speechSupported}
        products={products}
        isListening={isListening}
        transcript={inquiryTranscript}
        manualTranscript={manualInquiryTranscript}
        setManualTranscript={setManualInquiryTranscript}
        step={inquiryModalStep}
        draft={inquiryDraft}
        setDraft={setInquiryDraft}
        errorMessage={inquiryModalError}
        busy={inquiryBusy}
        onStartListening={startInquiryListening}
        onStopAndProcess={processInquiryTranscript}
        onCancel={resetInquiryModal}
        onBack={() => setInquiryModalStep("record")}
        onSave={saveInquiry}
        onProductNameChange={syncInquiryProductMatch}
        onProductFieldChange={updateInquiryProductField}
        onAddProductRow={addInquiryProductRow}
        onRemoveProductRow={removeInquiryProductRow}
      />
      <RecordSaleModal
        open={saleModalOpen}
        draft={saleDraft}
        setDraft={setSaleDraft}
        products={products.filter((product) => !product.archivedAt)}
        productSearch={saleProductSearch}
        setProductSearch={setSaleProductSearch}
        pickerOpen={salePickerOpen}
        setPickerOpen={setSalePickerOpen}
        busy={salesBusy}
        errorMessage={saleModalError}
        confirmation={saleConfirmation}
        onCancelConfirmation={() => setSaleConfirmation(null)}
        onConfirmSale={handleConfirmSale}
        onClose={resetSaleModal}
        onAddProduct={handleAddSaleProduct}
        onRemoveProduct={handleRemoveSaleProduct}
        onUpdateItem={handleUpdateSaleItem}
        onSave={handleSaveSale}
      />
      <RecordPurchaseModal
        open={purchaseModalOpen}
        draft={purchaseDraft}
        setDraft={setPurchaseDraft}
        busy={purchaseBusy}
        errorMessage={purchaseModalError}
        compressionMessage={compressionMessage}
        uploadStageMessage={uploadStageMessage}
        onReferenceImageChange={handlePurchaseReferenceImageChange}
        onClose={resetPurchaseModal}
        onAddProduct={handleAddPurchaseProduct}
        onRemoveProduct={handleRemovePurchaseProduct}
        onUpdateItem={handleUpdatePurchaseItem}
        onSave={handleSavePurchase}
      />
      <CatalogueBuilderModal
        open={catalogueModalOpen}
        draft={catalogueDraft}
        setDraft={setCatalogueDraft}
        products={products}
        productSearch={catalogueProductSearch}
        setProductSearch={setCatalogueProductSearch}
        pickerOpen={cataloguePickerOpen}
        setPickerOpen={setCataloguePickerOpen}
        onAddProduct={handleAddCatalogueProduct}
        onRemoveProduct={handleRemoveCatalogueProduct}
        onUpdateItem={handleUpdateCatalogueItem}
        onSave={handleSaveShareCatalogue}
        onCancel={resetCatalogueBuilder}
        busy={catalogueBusy}
        error={catalogueError}
      />
    </div>
  );

  return rootElement;
}
