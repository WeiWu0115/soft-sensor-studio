import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
const App = lazy(() => import("./App"));
const Research = lazy(() => import("./research/Research"));
const route = new URLSearchParams(location.search);
createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<p style={{ padding: 24 }}>Loading workspace…</p>}>
    {route.get("view") === "research" || route.has("paper") ? (
      <Research />
    ) : (
      <App />
    )}
  </Suspense>,
);
