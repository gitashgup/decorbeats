import React, { Suspense, lazy, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import "./styles.css";
import { useCaptureAdmin } from './adminRoute';

const CatalogueStudio = lazy(() => import("./capture/catalogue/CatalogueStudio"));
const CaptureApp = lazy(() => import("./capture/CaptureApp"));
const PublicDiwaliLookbook = lazy(() => import("./capture/PublicDiwaliLookbook"));
const TheBrassBook = lazy(() => import("./brass-book/TheBrassBook"));
document.documentElement.classList.add("js");

function isBrassBookRoute(pathname = "", search = "", hash = "") {
  const clean = String(pathname || "").replace(/\/+$/, "").toLowerCase();
  if (
    clean === "/brass-book" ||
    clean === "/the-brass-book" ||
    clean === "/brassbook" ||
    clean === "/encyclopedia"
  ) {
    return true;
  }
  const params = new URLSearchParams(search);
  if (params.get("tab") === "brass-book" || params.get("page") === "brass-book") return true;
  if (String(hash || "").toLowerCase().includes("brass-book")) return true;
  return false;
}

function isDiwaliLookbookRoute(pathname = "", search = "", hash = "") {
  const clean = String(pathname || "").replace(/\/+$/, "").toLowerCase();
  if (
    clean === "/diwali-stock" ||
    clean === "/diwali" ||
    clean === "/catalogue/diwali-2026" ||
    clean === "/catalog/diwali-2026"
  ) {
    return true;
  }
  const params = new URLSearchParams(search);
  if (params.get("lookbook") === "diwali") return true;
  if (String(hash || "").toLowerCase().includes("diwali-stock")) return true;
  return false;
}

function Root() {
  const [route, setRoute] = useState(() => ({
    pathname: typeof window !== "undefined" ? window.location.pathname : "/",
    search: typeof window !== "undefined" ? window.location.search : "",
    hash: typeof window !== "undefined" ? window.location.hash : ""
  }));

  useEffect(() => {
    function handleLocation() {
      setRoute({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      });
    }

    window.addEventListener("popstate", handleLocation);
    window.addEventListener("decorbeats:navigate", handleLocation);
    window.addEventListener("hashchange", handleLocation);
    return () => {
      window.removeEventListener("popstate", handleLocation);
      window.removeEventListener("decorbeats:navigate", handleLocation);
      window.removeEventListener("hashchange", handleLocation);
    };
  }, []);

  const isCaptureRoute = useCaptureAdmin(route.pathname, route.search, route.hash);
  const isBrassBook = isBrassBookRoute(route.pathname, route.search, route.hash);
  const isDiwaliLookbook = isDiwaliLookbookRoute(route.pathname, route.search, route.hash);

  // Isolated local review only. Vite removes this branch from production builds.
  const catalogueReview = import.meta.env.DEV && route.pathname === '/admin/capture' && new URLSearchParams(route.search).get('catalogue-preview') === '1';
  return (
    <React.StrictMode>
      {catalogueReview ? (
        <Suspense fallback={<div>Opening catalogue review…</div>}>
          <div className="dc-shell"><header className="dc-shell-header"><div className="dc-shell-brand"><img src="/assets/brand/decorbeats-logo.svg" alt=""/><span>Decorbeats</span></div></header><CatalogueStudio ownerId="local-review" reviewOnly /></div>
        </Suspense>
      ) : isCaptureRoute ? (
        <Suspense fallback={<div style={{ padding: 24, fontFamily: "sans-serif" }}>Opening capture studio…</div>}>
          <CaptureApp />
        </Suspense>
      ) : isBrassBook ? (
        <Suspense fallback={<div style={{ padding: 32, fontFamily: "serif", background: "#0c0907", color: "#d4af37", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>Opening The Brass Book Encyclopedia…</div>}>
          <TheBrassBook
            onBackToStore={() => {
              window.history.pushState({}, "", "/");
              window.dispatchEvent(new Event("decorbeats:navigate"));
            }}
          />
          <Analytics />
        </Suspense>
      ) : isDiwaliLookbook ? (
        <Suspense fallback={<div style={{ padding: 24, fontFamily: "sans-serif" }}>Opening Diwali 2026 Verified Stock Lookbook…</div>}>
          <PublicDiwaliLookbook
            onBackToStore={() => {
              window.history.pushState({}, "", "/");
              window.dispatchEvent(new Event("decorbeats:navigate"));
            }}
          />
          <Analytics />
        </Suspense>
      ) : (
        <>
          <App />
          <Analytics />
        </>
      )}
    </React.StrictMode>
  );
}

createRoot(document.getElementById("root")).render(<Root />);

