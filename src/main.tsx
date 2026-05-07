import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Tell Telegram the Mini App is ready — removes the white loading overlay
if (typeof window !== "undefined" && window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
}

createRoot(document.getElementById("root")!).render(<App />);