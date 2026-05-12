import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Telegram opens the WebView with `#tgWebAppData=...` in the URL fragment.
// Supabase's URL-session detection looks at the same fragment and can get
// confused (or corrupt the stored session) when it sees this payload. We
// don't use Telegram data anymore — strip the hash before Supabase boots.
if (typeof window !== "undefined" && window.location.hash.startsWith("#tgWebAppData")) {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

createRoot(document.getElementById("root")!).render(<App />);
