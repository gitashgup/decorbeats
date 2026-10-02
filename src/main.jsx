import React, { Suspense, lazy, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import "./styles.css";
import { useCaptureAdmin } from './adminRoute';

const CatalogueStudio = lazy(() => import("./capture/catalogue/CatalogueStudio"));
const CaptureApp = lazy(() => import("./capture/CaptureApp"));
document.documentElement.classList.add("js");

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

