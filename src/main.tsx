import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getTelegram } from "./lib/telegram";

// Tell Telegram the Mini App is ready — removes the white loading overlay
const tg = getTelegram();
if (tg) {
  tg.ready();
  tg.expand();
}

createRoot(document.getElementById("root")!).render(<App />);