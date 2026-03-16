import React, { useEffect, useMemo, useState } from "react";
import { products as seedProducts } from "./data/products";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

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

function ProductImage({ product }) {
  if (product.imageUrl) {
    return (
      <div className="product-image-shell">
        <img className="product-image" src={product.imageUrl} alt={product.name} loading="lazy" />
      </div>
    );
  }

  return (
    <div className="product-image-shell product-image-fallback">
      <span>{product.category}</span>
      <strong>{product.material}</strong>
      <small>{product.driveUrl ? "Drive folder linked" : "No image yet"}</small>
    </div>
  );
}

function ProductCard({ product, customerMode, onSelect }) {
  return (
    <button type="button" className="product-card" onClick={() => onSelect(product)}>
      <ProductImage product={product} />
      <div className="product-card-top">
        <span className={`stock-pill ${product.stockStatus !== "In stock" ? "warn" : ""}`}>{product.stockStatus}</span>
        <span className="sku-chip">{product.sku}</span>
      </div>
      <h3>{product.name}</h3>
      <p className="product-meta">
        {product.category} · {product.material}
      </p>
      <div className="product-quantity">{product.quantity} units available</div>
      <div className="product-pricing">
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
    </button>
  );
}

function DetailPanel({ product, customerMode }) {
  if (!product) {
    return (
      <aside className="detail-panel empty-panel">
        <p>Select a product to view product details.</p>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <ProductImage product={product} />
      <div className="detail-header">
        <div>
          <p className="eyebrow">Selected Product</p>
          <h2>{product.name}</h2>
        </div>
        <span className={`stock-pill ${product.stockStatus !== "In stock" ? "warn" : ""}`}>{product.stockStatus}</span>
      </div>
      <div className="detail-grid">
        <div>
          <span className="detail-label">SKU</span>
          <strong>{product.sku}</strong>
        </div>
        <div>
          <span className="detail-label">Category</span>
          <strong>{product.category}</strong>
        </div>
        <div>
          <span className="detail-label">Material</span>
          <strong>{product.material}</strong>
        </div>
        <div>
          <span className="detail-label">Quantity</span>
          <strong>{product.quantity}</strong>
        </div>
      </div>
      <div className="detail-section">
        <span className="detail-label">Pricing</span>
        <div className="pricing-stack">
          <div>MRP: {formatCurrency(product.pricing.mrp)}</div>
          {!customerMode ? <div>B2B: {formatCurrency(product.pricing.b2b)}</div> : null}
          {!customerMode ? <div>Unit cost: {formatCurrency(product.pricing.unitCost)}</div> : null}
        </div>
      </div>
      {product.notes && !customerMode ? (
        <div className="detail-section">
          <span className="detail-label">Notes</span>
          <p>{product.notes}</p>
        </div>
      ) : null}
      <div className="detail-section">
        <span className="detail-label">Media</span>
        <div className="pricing-stack">
          <div>Image URL: {product.imageUrl || "Not set"}</div>
          <div>Drive folder: {product.driveUrl || "Not set"}</div>
        </div>
      </div>
    </aside>
  );
}

function AuthPanel({ email, setEmail, authBusy, userEmail, onSignIn, onSignOut }) {
  return (
    <section className="admin-panel auth-panel">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Admin Access</p>
          <h2>{userEmail ? "Signed in" : "Sign in for admin actions"}</h2>
        </div>
        {userEmail ? (
          <button type="button" className="ghost-button" onClick={onSignOut}>
            Sign out
          </button>
        ) : null}
      </div>

      {userEmail ? (
        <p className="auth-copy">Admin edits and photo uploads are enabled for {userEmail}.</p>
      ) : (
        <>
          <p className="auth-copy">Enter your email and Supabase will send you a secure magic link to sign in.</p>
          <div className="auth-row">
            <input
              className="search-input"
              type="email"
              placeholder="your-email@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="button" className="primary-button" disabled={authBusy} onClick={onSignIn}>
              {authBusy ? "Sending..." : "Send magic link"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function ImportPanel({ importBusy, onFileChange }) {
  return (
    <section className="admin-panel">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Bulk Import</p>
          <h2>Load inventory from CSV</h2>
        </div>
      </div>
      <p className="auth-copy">
        Upload your inventory CSV to create or refresh products in Supabase. Existing SKUs are updated, new SKUs are inserted.
      </p>
      <div className="upload-row">
        <label className="upload-button">
          {importBusy ? "Importing..." : "Choose CSV"}
          <input type="file" accept=".csv,text/csv" onChange={onFileChange} disabled={importBusy} />
        </label>
      </div>
    </section>
  );
}

function ProductForm({ form, setForm, onSubmit, onReset, uploadBusy, saveBusy, onFileChange }) {
  return (
    <form className="admin-panel" onSubmit={onSubmit}>
      <div className="admin-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>{form.id ? "Edit product" : "Add product"}</h2>
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
          Unit cost
          <input type="number" value={form.unitCost} onChange={(event) => setForm((current) => ({ ...current, unitCost: event.target.value }))} />
        </label>
        <label>
          MRP
          <input type="number" value={form.mrp} onChange={(event) => setForm((current) => ({ ...current, mrp: event.target.value }))} />
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

      <div className="upload-row">
        <label className="upload-button">
          {uploadBusy ? "Uploading..." : "Upload photo"}
          <input type="file" accept="image/*" onChange={onFileChange} disabled={uploadBusy} />
        </label>
        <button type="submit" className="primary-button" disabled={saveBusy}>
          {saveBusy ? "Saving..." : form.id ? "Update product" : "Create product"}
        </button>
      </div>
    </form>
  );
}

export default function App() {
  const [customerMode, setCustomerMode] = useState(false);
  const [products, setProducts] = useState(seedProducts.map(toProduct));
  const [selectedId, setSelectedId] = useState(seedProducts[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    isSupabaseConfigured
      ? "Supabase is connected. Sign in to lock admin actions to your account before deploying."
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
        setStatusMessage("Supabase is configured, but the products table is not ready yet.");
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
        setStatusMessage("Supabase is connected. Use the admin form to create your first product.");
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

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const haystack = [product.name, product.sku, product.category, product.material]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [products, search]);

  const selectedProduct =
    filteredProducts.find((product) => product.id === selectedId) || products.find((product) => product.id === selectedId) || null;

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
      setStatusMessage(`Magic link sent to ${authEmail}. Open it on this device to unlock admin actions.`);
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
    setStatusMessage("Signed out. Customer catalog is still visible, but admin actions are locked.");
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
          return exists
            ? current.map((product) => (product.id === normalized.id ? normalized : product))
            : [normalized, ...current];
        });
        setSelectedId(normalized.id);
        setStatusMessage(`${normalized.name} saved to Supabase.`);
      } else {
        const normalized = toProduct({
          id: form.id || Date.now(),
          sku: payload.sku,
          slug: payload.slug,
          name: payload.name,
          category: payload.category,
          material: payload.material,
          quantity: payload.quantity,
          unit_cost: payload.unit_cost,
          mrp: payload.mrp,
          b2b_price: payload.b2b_price,
          notes: payload.notes,
          drive_url: payload.drive_url,
          image_url: payload.image_url
        });
        setProducts((current) => {
          const exists = current.some((product) => product.id === normalized.id);
          return exists
            ? current.map((product) => (product.id === normalized.id ? normalized : product))
            : [normalized, ...current];
        });
        setSelectedId(normalized.id);
        setStatusMessage(`${normalized.name} saved locally. Add Supabase env vars to make it shared across devices.`);
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
      setStatusMessage("Photo upload needs Supabase Storage configured. For now, paste a direct image URL into the form.");
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
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, {
        upsert: true
      });
      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((current) => ({ ...current, imageUrl: data.publicUrl }));
      setStatusMessage("Photo uploaded. Save the product to store the image URL.");
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

      const { data, error } = await supabase.from("products").upsert(payload, { onConflict: "sku" }).select();
      if (error) {
        throw error;
      }

      const nextProducts = (data ?? []).map(toProduct);
      const { data: refreshed, error: refreshError } = await supabase.from("products").select("*").order("name");
      if (refreshError) {
        throw refreshError;
      }

      const normalized = (refreshed ?? nextProducts).map(toProduct);
      setProducts(normalized);
      setSelectedId(normalized[0]?.id ?? null);
      setStatusMessage(
        duplicates
          ? `Imported ${payload.length} unique SKUs from ${file.name}. ${duplicates} duplicate SKU row(s) were merged during import.`
          : `Imported ${payload.length} rows from ${file.name}.`
      );
    } catch (error) {
      setStatusMessage(error.message || "CSV import failed.");
    } finally {
      setImportBusy(false);
      event.target.value = "";
    }
  }

  const stats = useMemo(() => {
    return {
      totalProducts: products.length,
      totalUnits: products.reduce((sum, product) => sum + Number(product.quantity || 0), 0),
      lowStock: products.filter((product) => product.stockStatus === "Low stock").length,
      withImages: products.filter((product) => product.imageUrl).length
    };
  }, [products]);

  return (
    <div className="app-shell">
      <header className="hero-shell">
        <div className="hero-copy-shell">
          <p className="eyebrow">Decorbeats Inventory</p>
          <h1>Mobile-friendly inventory software with a real backend path.</h1>
          <p className="hero-copy">
            Use admin mode to add products, update stock, and upload photos. Use customer mode to browse a cleaner shareable catalog.
          </p>
          <div className="toggle-row">
            <button type="button" className={customerMode ? "toggle-button" : "toggle-button active"} onClick={() => setCustomerMode(false)}>
              Admin view
            </button>
            <button type="button" className={customerMode ? "toggle-button active" : "toggle-button"} onClick={() => setCustomerMode(true)}>
              Customer view
            </button>
          </div>
          <p className="status-banner">{statusMessage}</p>
        </div>

        <section className="stats-grid">
          <article>
            <span>Total products</span>
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
        </section>
      </header>

      {!customerMode ? (
        <>
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
        </>
      ) : null}

      <section className="controls-shell">
        <input
          className="search-input"
          type="search"
          placeholder="Search by product name, SKU, category, or material"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </section>

      <main className="workspace-grid">
        <section className="catalog-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="catalog-item">
              <ProductCard product={product} customerMode={customerMode} onSelect={startEdit} />
              {!customerMode && canManage ? (
                <div className="inline-actions">
                  <button type="button" className="ghost-button" onClick={() => startEdit(product)}>
                    Edit
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </section>

        <DetailPanel product={selectedProduct} customerMode={customerMode} />
      </main>
    </div>
  );
}
