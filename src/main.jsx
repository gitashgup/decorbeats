import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import "./styles.css";

const CaptureApp = lazy(() => import("./capture/CaptureApp"));
document.documentElement.classList.add("js");
const isCaptureRoute = window.location.pathname === "/admin/capture";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isCaptureRoute ? (
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
