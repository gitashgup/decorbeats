import React, { Suspense, lazy, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import "./styles.css";
import { useCaptureAdmin } from './adminRoute';

const CaptureApp = lazy(() => import("./capture/CaptureApp"));
const PublicDiwaliLookbook = lazy(() => import("./capture/PublicDiwaliLookbook"));
document.documentElement.classList.add("js");

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
  const isDiwaliLookbook = isDiwaliLookbookRoute(route.pathname, route.search, route.hash);

  return (
    <React.StrictMode>
      {isCaptureRoute ? (
        <Suspense fallback={<div style={{ padding: 24, fontFamily: "sans-serif" }}>Opening capture studio…</div>}>
          <CaptureApp />
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

