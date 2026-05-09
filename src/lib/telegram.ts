// Telegram WebApp helpers
export type TgUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  language_code?: string;
};

type TgWebApp = {
  initData: string;
  initDataUnsafe?: { user?: TgUser };
  ready: () => void;
  expand: () => void;
  colorScheme?: "light" | "dark";
  platform?: string;
  version?: string;
};

export function getTelegram(): TgWebApp | null {
  // @ts-expect-error injected by telegram-web-app.js
  return typeof window !== "undefined" ? window.Telegram?.WebApp ?? null : null;
}

export function getInitData(): string | null {
  const tg = getTelegram();
  if (tg?.initData && tg.initData.length > 0) return tg.initData;
  return null;
}

export function getTgUser(): TgUser | null {
  return getTelegram()?.initDataUnsafe?.user ?? null;
}

/**
 * Wait for the Telegram WebApp SDK to load. The script
 * `https://telegram.org/js/telegram-web-app.js` is loaded from <head>, but on
 * slow networks or cold WebView starts the script may not be ready by the
 * time React's first useEffect fires. Poll every `intervalMs` (100ms) up to
 * `timeoutMs` (default 3000ms) and resolve true as soon as the WebApp object
 * appears, otherwise false.
 *
 * Bot-style hint detection (URL contains tgWebAppData=) provides an immediate
 * positive answer even before the script object materialises.
 */
export async function waitForTelegramSdk(timeoutMs = 3000, intervalMs = 100): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (getTelegram()) return true;

  // Hash usually contains tgWebAppData=... when launched from Telegram, even
  // before the SDK script finishes loading. Use it as a fast positive signal.
  const looksLikeTelegramLaunch =
    typeof window.location !== "undefined" &&
    (window.location.hash.includes("tgWebApp") ||
      window.location.search.includes("tgWebApp"));

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    if (getTelegram()) return true;
  }
  return looksLikeTelegramLaunch; // last-ditch: trust the URL hint
}

/**
 * Wait for `window.Telegram.WebApp.initData` to become populated.
 *
 * Telegram injects window.Telegram.WebApp synchronously when the SDK script
 * loads, but the `initData` string (which contains the signed user payload)
 * can lag behind by hundreds of milliseconds — especially on cold starts,
 * slow networks, or older devices. If we read `initData` immediately on app
 * boot, we frequently get an empty string and fall back to the email auth
 * screen, even though we ARE inside the Telegram WebView.
 *
 * This poller checks every `intervalMs` (default 100ms) up to `timeoutMs`
 * (default 5000ms) and resolves with the populated string as soon as it
 * appears, or null if the timeout elapses first.
 */
export async function waitForInitData(
  timeoutMs = 5000,
  intervalMs = 100,
): Promise<string | null> {
  const immediate = getInitData();
  if (immediate) return immediate;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const data = getInitData();
    if (data) return data;
  }
  return null;
}

/**
 * Returns true if we appear to be running inside the Telegram WebView.
 * This is the SYNCHRONOUS check; for async (poll-and-wait) detection use
 * `waitForTelegramSdk()` which waits for the SDK script to load.
 */
export function isInTelegram(): boolean {
  return !!getTelegram();
}
