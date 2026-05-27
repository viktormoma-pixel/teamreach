import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import * as amplitude from "@amplitude/unified";

amplitude.initAll(import.meta.env.VITE_AMPLITUDE_API_KEY as string, {
  analytics: {
    remoteConfig: { fetchRemoteConfig: true }, // remote SDK config from Amplitude
    autocapture: {
      attribution: true,             // UTM / referrer attribution events
      pageViews: true,               // SPA route changes + initial load
      sessions: true,                // Session start / end events
      formInteractions: true,        // Form starts + submits
      fileDownloads: true,           // Downloads of common file types
      elementInteractions: true,     // Click + change on instrumented els
      frustrationInteractions: true, // Rage clicks, dead clicks
      pageUrlEnrichment: true,       // Adds path / search to event props
      networkTracking: true,         // XHR + fetch request events
      webVitals: true,               // CWV (LCP, INP, CLS) on page hide
    },
  },
  sessionReplay: { sampleRate: 1 }, // Record user sessions; comment out to disable
  engagement: {},                   // In-product Guides & Surveys; comment out to disable
});

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
