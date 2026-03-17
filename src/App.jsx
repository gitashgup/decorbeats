import React, { useEffect, useMemo, useState } from "react";
import { products as seedProducts } from "./data/products";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const brandLogo = "/assets/brand/decorbeats-logo.svg";

const emptyForm = {
  id: "",
  sku: "",
  name: "",
  category: "",
  material: "",
  quantity: 0,
  unitCost: "",
  mrp: "",
  b2b: "",
  notes: "",
  driveUrl: "",
  imageUrl: ""
};

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

function normalizeUrl(value) {
  const url = safeText(value);
  if (!url || url === "[URL]") {
    return "";
  }
  return url;
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

function toProduct(raw, index = 0) {
  const quantity = Number(raw.quantity ?? 0);
  return {
    id: raw.id ?? index + 1,
    slug: raw.slug ?? slugify(`${raw.sku}-${raw.name}`),
    sku: raw.sku ?? "",
    name: raw.name ?? "",
    category: raw.category ?? "Uncategorized",
    material: raw.material ?? "Unspecified",
    quantity,
    stockStatus: quantity <= 0 ? "Out of stock" : quantity <= 10 ? "Low stock" : "In stock",
    driveUrl: raw.driveUrl ?? raw.drive_url ?? "",
    imageUrl: raw.imageUrl ?? raw.image_url ?? "",
    notes: raw.notes ?? "",
    pricing: {
      unitCost: raw.pricing?.unitCost ?? raw.unit_cost ?? null,
      mrp: raw.pricing?.mrp ?? raw.mrp ?? null,
      b2b: raw.pricing?.b2b ?? raw.b2b_price ?? null
    }
  };
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
    unit_cost: parseNumber(row["Unit Cost"]),
    mrp: parseNumber(row.MRP),
    b2b_price: parseNumber(row["B2B Price"]),
    notes: safeText(row.Notes),
    drive_url: normalizeUrl(row["Column 1"]),
    image_url: normalizeUrl(row["Product Image URL"])
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
  if (product?.imageUrl) {
    return (
      <div className={`product-image-shell ${compact ? "compact" : ""}`}>
        <img className="product-image" src={product.imageUrl} alt={product.name} loading="lazy" />
      </div>
    );
  }

  return (
    <div className={`product-image-shell product-image-fallback ${compact ? "compact" : ""}`}>
      <span>{product?.category ?? "Decorbeats"}</span>
      <strong>{product?.material ?? "Crafted collection"}</strong>
      <small>{product?.driveUrl ? "Drive folder linked" : "Image coming soon"}</small>
    </div>
  );
}

function BrandHeader({ customerMode, setCustomerMode, userEmail }) {
  return (
    <header className="brand-header">
      <div className="brand-lockup welcome-lockup">
        <img src={brandLogo} alt="Decorbeats" className="brand-logo" />
        <div>
          <p className="eyebrow">Decorbeats</p>
          <h1>Welcome to the World of Gifting</h1>
          <p className="welcome-subcopy">
            Discover a cleaner Decorbeats experience designed to feel elegant for customers and effortless for your team, especially on mobile.
          </p>
        </div>
      </div>
      <div className="brand-actions">
        <div className="mode-switch" role="tablist" aria-label="View mode">
          <button type="button" className={!customerMode ? "mode-pill active" : "mode-pill"} onClick={() => setCustomerMode(false)}>
            Admin
          </button>
          <button type="button" className={customerMode ? "mode-pill active" : "mode-pill"} onClick={() => setCustomerMode(true)}>
            Customer
          </button>
        </div>
        <div className="user-badge">{userEmail ? `Signed in: ${userEmail}` : "Admin sign-in available"}</div>
      </div>
    </header>
  );
}

function HeroPanel({ customerMode, selectedProduct, stats, statusMessage }) {
  return (
    <section className="hero-panel">
      <div className="hero-copy">
        <p className="eyebrow">{customerMode ? "Customer Entrance" : "Admin Entrance"}</p>
        <h2>{customerMode ? "A polished catalogue for sharing with customers." : "A refined workspace to manage products and gifting collections."}</h2>
        <p>{customerMode ? "Browse products with less clutter and more focus on the collection itself." : "Import stock, update products, and manage imagery without losing the premium Decorbeats feel."}</p>
        <div className="hero-status">{statusMessage}</div>
      </div>

      <div className="hero-focus">
        <div className="stats-strip">
          <article>
            <span>Products</span>
            <strong>{stats.totalProducts}</strong>
          </article>
          <article>
            <span>Total units</span>
            <strong>{stats.totalUnits}</strong>
          </article>
          <article>
            <span>Low stock</span>
            <strong>{stats.lowStock}</strong>
          </article>
          <article>
            <span>With photos</span>
            <strong>{stats.withImages}</strong>
          </article>
        </div>

        {selectedProduct ? (
          <div className="focus-card">
            <ProductImage product={selectedProduct} compact />
            <div className="focus-copy">
              <span className={`stock-pill ${selectedProduct.stockStatus !== "In stock" ? "warn" : ""}`}>{customerMode ? "Featured Now" : selectedProduct.stockStatus}</span>
              <h3>{selectedProduct.name}</h3>
              <p>
                {selectedProduct.category} · {selectedProduct.material}
              </p>
              <div className="focus-meta">
                <div>
                  <span>SKU</span>
                  <strong>{selectedProduct.sku}</strong>
                </div>
                <div>
                  <span>MRP</span>
                  <strong>{formatCurrency(selectedProduct.pricing.mrp)}</strong>
                </div>
                <div>
                  <span>Qty</span>
                  <strong>{selectedProduct.quantity}</strong>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ControlBar({ search, setSearch, categoryFilter, setCategoryFilter, categories }) {
  return (
    <section className="control-bar">
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

function AuthPanel({ email, setEmail, authBusy, userEmail, onSignIn, onSignOut }) {
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
        <p className="support-copy">You can now import stock, edit products, and upload images.</p>
      ) : (
        <div className="auth-row">
          <input
            className="search-input"
            type="email"
            placeholder="admin-email@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="button" className="primary-button" disabled={authBusy} onClick={onSignIn}>
            {authBusy ? "Sending..." : "Send magic link"}
          </button>
        </div>
      )}
    </section>
  );
}

function ImportPanel({ importBusy, onFileChange }) {
  return (
    <section className="panel-card admin-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Bulk Import</p>
          <h3>Refresh inventory from CSV</h3>
        </div>
      </div>
      <p className="support-copy">Use the same spreadsheet format to create new products or refresh matching SKUs in one go.</p>
      <label className="upload-button">
        {importBusy ? "Importing..." : "Choose inventory CSV"}
        <input type="file" accept=".csv,text/csv" onChange={onFileChange} disabled={importBusy} />
      </label>
    </section>
  );
}

function ProductForm({ form, setForm, onSubmit, onReset, uploadBusy, saveBusy, onFileChange }) {
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

      <div className="form-grid">
        <label>
          SKU
          <input value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} required />
        </label>
        <label>
          Product name
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
        </label>
        <label>
          Category
          <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
        </label>
        <label>
          Material
          <input value={form.material} onChange={(event) => setForm((current) => ({ ...current, material: event.target.value }))} />
        </label>
        <label>
          Quantity
          <input type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
        </label>
        <label>
          MRP
          <input type="number" value={form.mrp} onChange={(event) => setForm((current) => ({ ...current, mrp: event.target.value }))} />
        </label>
        <label>
          Unit cost
          <input type="number" value={form.unitCost} onChange={(event) => setForm((current) => ({ ...current, unitCost: event.target.value }))} />
        </label>
        <label>
          B2B price
          <input type="number" value={form.b2b} onChange={(event) => setForm((current) => ({ ...current, b2b: event.target.value }))} />
        </label>
        <label className="span-2">
          Drive folder URL
          <input value={form.driveUrl} onChange={(event) => setForm((current) => ({ ...current, driveUrl: event.target.value }))} />
        </label>
        <label className="span-2">
          Image URL
          <input value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} />
        </label>
        <label className="span-2">
          Notes
          <textarea rows="4" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </label>
      </div>

      <div className="cta-row">
        <label className="upload-button secondary">
          {uploadBusy ? "Uploading..." : "Upload image"}
          <input type="file" accept="image/*" onChange={onFileChange} disabled={uploadBusy} />
        </label>
        <button type="submit" className="primary-button" disabled={saveBusy}>
          {saveBusy ? "Saving..." : form.id ? "Update product" : "Create product"}
        </button>
      </div>
    </form>
  );
}

function ProductCard({ product, customerMode, onSelect }) {
  return (
    <article className="product-card" onClick={() => onSelect(product)}>
      <ProductImage product={product} compact />
      <div className="product-card-body">
        <div className="product-card-top">
          <span className={`stock-pill ${product.stockStatus !== "In stock" ? "warn" : ""}`}>{product.stockStatus}</span>
          <span className="sku-chip">{product.sku}</span>
        </div>
        <h3>{product.name}</h3>
        <p className="product-meta">
          {product.category} · {product.material}
        </p>
        <div className="product-card-footer">
          <div>
            <span>MRP</span>
            <strong>{formatCurrency(product.pricing.mrp)}</strong>
          </div>
          <div>
            <span>{customerMode ? "Available" : "In stock"}</span>
            <strong>{product.quantity}</strong>
          </div>
          {!customerMode ? (
            <div>
              <span>B2B</span>
              <strong>{formatCurrency(product.pricing.b2b)}</strong>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DetailPanel({ product, customerMode }) {
  if (!product) {
    return (
      <aside className="detail-panel">
        <div className="detail-empty">
          <p className="eyebrow">Selection</p>
          <h3>Choose a product to see full details.</h3>
        </div>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <ProductImage product={product} />
      <div className="section-head">
        <div>
          <p className="eyebrow">Selected Product</p>
          <h3>{product.name}</h3>
        </div>
        <span className={`stock-pill ${product.stockStatus !== "In stock" ? "warn" : ""}`}>{product.stockStatus}</span>
      </div>
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
        <div>
          <span>Quantity</span>
          <strong>{product.quantity}</strong>
        </div>
        <div>
          <span>MRP</span>
          <strong>{formatCurrency(product.pricing.mrp)}</strong>
        </div>
        {!customerMode ? (
          <div>
            <span>B2B</span>
            <strong>{formatCurrency(product.pricing.b2b)}</strong>
          </div>
        ) : null}
      </div>
      {product.notes && !customerMode ? <p className="detail-note">{product.notes}</p> : null}
      <div className="detail-links">
        {product.imageUrl ? (
          <a className="ghost-button" href={product.imageUrl} target="_blank" rel="noreferrer">
            Open image
          </a>
        ) : null}
        {product.driveUrl ? (
          <a className="ghost-button" href={product.driveUrl} target="_blank" rel="noreferrer">
            Open Drive folder
          </a>
        ) : null}
      </div>
    </aside>
  );
}

export default function App() {
  const [customerMode, setCustomerMode] = useState(false);
  const [products, setProducts] = useState(seedProducts.map(toProduct));
  const [selectedId, setSelectedId] = useState(seedProducts[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusMessage, setStatusMessage] = useState(
    isSupabaseConfigured
      ? "Supabase is connected. Sign in to manage products, import stock, and upload imagery."
      : "Supabase env vars are not set yet, so the app is running with your local seed inventory."
  );
  const [form, setForm] = useState(emptyForm);
  const [saveBusy, setSaveBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session ?? null);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    async function loadProducts() {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (cancelled) {
        return;
      }
      if (error) {
        setStatusMessage("Supabase is configured, but product data could not be loaded.");
        return;
      }
      if (data?.length) {
        const nextProducts = data.map(toProduct);
        setProducts(nextProducts);
        setSelectedId(nextProducts[0]?.id ?? null);
        setStatusMessage(`Loaded ${nextProducts.length} products from Supabase.`);
      } else {
        setProducts([]);
        setSelectedId(null);
        setStatusMessage("Supabase is connected. Add products manually or import your CSV.");
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const userEmail = session?.user?.email ?? "";
  const canManage = Boolean(userEmail) || !isSupabaseConfigured;

  const categories = useMemo(() => {
    return ["All", ...new Set(products.map((product) => product.category).filter(Boolean).sort((left, right) => left.localeCompare(right)))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const haystack = [product.name, product.sku, product.category, product.material].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "All" || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, products, search]);

  const selectedProduct =
    filteredProducts.find((product) => product.id === selectedId) ||
    products.find((product) => product.id === selectedId) ||
    null;

  const stats = useMemo(() => {
    return {
      totalProducts: products.length,
      totalUnits: products.reduce((sum, product) => sum + Number(product.quantity || 0), 0),
      lowStock: products.filter((product) => product.stockStatus === "Low stock").length,
      withImages: products.filter((product) => product.imageUrl).length
    };
  }, [products]);

  function startEdit(product) {
    setSelectedId(product.id);
    setForm({
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      material: product.material,
      quantity: product.quantity,
      unitCost: product.pricing.unitCost ?? "",
      mrp: product.pricing.mrp ?? "",
      b2b: product.pricing.b2b ?? "",
      notes: product.notes ?? "",
      driveUrl: product.driveUrl ?? "",
      imageUrl: product.imageUrl ?? ""
    });
  }

  async function handleSignIn() {
    if (!isSupabaseConfigured || !authEmail) {
      return;
    }

    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: authEmail,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) {
        throw error;
      }
      setStatusMessage(`Magic link sent to ${authEmail}. Use the newest email to sign in on this device.`);
    } catch (error) {
      setStatusMessage(error.message || "Could not send sign-in link.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    if (!isSupabaseConfigured) {
      return;
    }
    await supabase.auth.signOut();
    setForm(emptyForm);
    setStatusMessage("Signed out. Customer browsing stays open, while editing is locked.");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canManage) {
      setStatusMessage("Sign in first to create or update products.");
      return;
    }

    setSaveBusy(true);

    const payload = {
      sku: form.sku,
      slug: slugify(`${form.sku}-${form.name}`),
      name: form.name,
      category: form.category || "Uncategorized",
      material: form.material || "Unspecified",
      quantity: Number(form.quantity || 0),
      unit_cost: form.unitCost === "" ? null : Number(form.unitCost),
      mrp: form.mrp === "" ? null : Number(form.mrp),
      b2b_price: form.b2b === "" ? null : Number(form.b2b),
      notes: form.notes,
      drive_url: form.driveUrl,
      image_url: form.imageUrl
    };

    try {
      if (isSupabaseConfigured) {
        const query = form.id
          ? supabase.from("products").update(payload).eq("id", form.id).select().single()
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
        setStatusMessage(`${normalized.name} saved to Supabase.`);
      } else {
        const normalized = toProduct({
          id: form.id || Date.now(),
          ...payload
        });
        setProducts((current) => {
          const exists = current.some((product) => product.id === normalized.id);
          return exists ? current.map((product) => (product.id === normalized.id ? normalized : product)) : [normalized, ...current];
        });
        setSelectedId(normalized.id);
        setStatusMessage(`${normalized.name} saved locally.`);
      }

      setForm(emptyForm);
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

    setUploadBusy(true);
    try {
      const extension = file.name.split(".").pop();
      const path = `${form.sku || "draft"}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((current) => ({ ...current, imageUrl: data.publicUrl }));
      setStatusMessage("Image uploaded. Save the product to store it.");
    } catch (error) {
      setStatusMessage(error.message || "Image upload failed.");
    } finally {
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
      const mappedRows = rows.map(mapCsvRowToPayload).filter(Boolean);
      const { rows: payload, duplicates } = dedupePayloadBySku(mappedRows);

      if (!payload.length) {
        setStatusMessage("No usable inventory rows were found in that CSV.");
        return;
      }

      const { error } = await supabase.from("products").upsert(payload, { onConflict: "sku" });
      if (error) {
        throw error;
      }

      const { data: refreshed, error: refreshError } = await supabase.from("products").select("*").order("name");
      if (refreshError) {
        throw refreshError;
      }

      const normalized = (refreshed ?? []).map(toProduct);
      setProducts(normalized);
      setSelectedId(normalized[0]?.id ?? null);
      setStatusMessage(
        duplicates
          ? `Imported ${payload.length} unique SKUs from ${file.name}. ${duplicates} duplicate SKU row(s) were merged.`
          : `Imported ${payload.length} rows from ${file.name}.`
      );
    } catch (error) {
      setStatusMessage(error.message || "CSV import failed.");
    } finally {
      setImportBusy(false);
      event.target.value = "";
    }
  }

  return (
    <div className="app-shell">
      <BrandHeader customerMode={customerMode} setCustomerMode={setCustomerMode} userEmail={userEmail} />
      <HeroPanel customerMode={customerMode} selectedProduct={selectedProduct} stats={stats} statusMessage={statusMessage} />
      <ControlBar
        search={search}
        setSearch={setSearch}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        categories={categories}
      />

      {!customerMode ? (
        <section className="admin-grid">
          <AuthPanel
            email={authEmail}
            setEmail={setAuthEmail}
            authBusy={authBusy}
            userEmail={userEmail}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
          />
          {canManage ? (
            <>
              <ImportPanel importBusy={importBusy} onFileChange={handleCsvImport} />
              <ProductForm
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                onReset={() => setForm(emptyForm)}
                uploadBusy={uploadBusy}
                saveBusy={saveBusy}
                onFileChange={handleFileChange}
              />
            </>
          ) : null}
        </section>
      ) : null}

      <main className="content-grid">
        <section className="catalog-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} customerMode={customerMode} onSelect={startEdit} />
          ))}
        </section>
        <DetailPanel product={selectedProduct} customerMode={customerMode} />
      </main>
    </div>
  );
}
