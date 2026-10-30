import { createRoot } from "react-dom/client";
import "./styles.css";
const route = new URLSearchParams(location.search);
if (route.get("view") === "research" || route.has("paper")) {
  location.replace(`./research.html${location.search}`);
} else {
  import("./App").then(({ default: App }) =>
    createRoot(document.getElementById("root")!).render(<App />),
  );
}
