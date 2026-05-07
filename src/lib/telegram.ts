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
