import React, { Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const Analytics = lazy(() =>
  import("@vercel/analytics/react").then((module) => ({ default: module.Analytics }))
);
const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/react").then((module) => ({ default: module.SpeedInsights }))
);

function DeferredInsights() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let scheduleId;
    if ("requestIdleCallback" in window) {
      scheduleId = window.requestIdleCallback(() => setReady(true), { timeout: 3500 });
      return () => window.cancelIdleCallback(scheduleId);
    }
    scheduleId = window.setTimeout(() => setReady(true), 2000);
    return () => window.clearTimeout(scheduleId);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Analytics />
      <SpeedInsights />
    </Suspense>
  );
}

document.documentElement.classList.add("js");

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <DeferredInsights />
  </React.StrictMode>
);
