import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Telegram opens the WebView with `#tgWebAppData=...` in the URL fragment.
// Supabase's URL-session detection looks at the same fragment and can get
// confused (or corrupt the stored session) when it sees this payload. However,
// the Telegram SDK must read the hash to populate window.Telegram.WebApp.initData.
// We delay stripping until after the SDK loads (indicated by window.Telegram.WebApp availability).
async function initApp() {
  if (typeof window !== "undefined" && window.location.hash.startsWith("#tgWebAppData")) {
    // Wait for Telegram SDK to load and parse the hash (max 5 seconds)
    let attempts = 50;
    while (attempts-- > 0 && !window.Telegram?.WebApp) {
      await new Promise(r => setTimeout(r, 100));
    }

    // Now that SDK has parsed initData, strip the hash so Supabase doesn't get confused
    if (window.Telegram?.WebApp) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

initApp();
