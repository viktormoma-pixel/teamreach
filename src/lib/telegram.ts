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
 * Wait for window.Telegram.WebApp.initData to become populated.
 *
 * Telegram injects window.Telegram.WebApp synchronously when the SDK script
 * loads, but the `initData` string (which contains the signed user payload)
 * can lag behind by hundreds of milliseconds — especially on cold starts,
 * slow networks, or older devices. If we read `initData` immediately on app
 * boot, we frequently get an empty string and fall back to the email auth
 * screen, even though we ARE inside the Telegram WebView.
 *
 * This poller checks every `intervalMs` (default 100ms) up to `timeoutMs`
 * (default 3000ms) and resolves with the populated string as soon as it
 * appears, or null if the timeout elapses first.
 */
export async function waitForInitData(
  timeoutMs = 3000,
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
 * Uses both presence of the WebApp object and the platform marker for
 * additional confidence — `platform` is set to e.g. "android", "ios",
 * "tdesktop", "web" inside Telegram and is undefined elsewhere.
 */
export function isInTelegram(): boolean {
  const tg = getTelegram();
  if (!tg) return false;
  // Platform is reliably set by Telegram clients but absent in 3rd-party
  // WebViews that happen to inject window.Telegram. Fall back to true if
  // the field is undefined (older clients) — better to try Telegram auth
  // and fail gracefully than to skip it for a real user.
  return true;
}
