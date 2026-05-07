import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Добавляем инициализацию Telegram
if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
  const tg = (window as any).Telegram.WebApp;
  tg.ready();
  tg.expand(); // Это развернет окно на максимум
  console.log("Telegram WebApp is ready");
}

createRoot(document.getElementById("root")!).render(<App />);