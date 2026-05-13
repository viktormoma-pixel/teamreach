// Isomorphic Telegram Mini App initData verification.
// Works in both Deno (edge function) and Node/jsdom (vitest) because
// it relies only on the WebCrypto API (globalThis.crypto.subtle).
//
// Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export class TelegramVerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramVerifyError";
  }
}

const enc = new TextEncoder();

async function hmacSha256(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return globalThis.crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify a Telegram Mini App initData payload and parse the contained user.
 * Throws TelegramVerifyError on any failure (invalid signature, expired
 * auth_date, missing or malformed fields).
 */
export async function verifyAndParseInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number,
  nowMs: number = Date.now(),
): Promise<TelegramUser> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new TelegramVerifyError("missing hash in initData");

  // data-check-string: all fields except hash, sorted alphabetically, key=value joined by \n
  params.delete("hash");
  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // secret_key = HMAC-SHA256(key="WebAppData", data=botToken)
  const secretKeyBytes = await hmacSha256(enc.encode("WebAppData"), botToken);
  // computed_hash = HMAC-SHA256(key=secret_key, data=checkString)
  const signatureBytes = await hmacSha256(secretKeyBytes, checkString);
  const computedHash = toHex(signatureBytes);

  if (computedHash !== hash) throw new TelegramVerifyError("initData signature invalid");

  const authDateStr = params.get("auth_date");
  if (!authDateStr) throw new TelegramVerifyError("missing auth_date in initData");
  const authDate = parseInt(authDateStr, 10);
  if (!Number.isFinite(authDate)) throw new TelegramVerifyError("invalid auth_date in initData");
  const now = Math.floor(nowMs / 1000);
  if (now - authDate > maxAgeSeconds) {
    throw new TelegramVerifyError(
      `initData expired: ${now - authDate}s old (max ${maxAgeSeconds}s)`,
    );
  }

  const userStr = params.get("user");
  if (!userStr) throw new TelegramVerifyError("missing user in initData");
  let user: TelegramUser;
  try {
    user = JSON.parse(userStr) as TelegramUser;
  } catch {
    throw new TelegramVerifyError("invalid user JSON in initData");
  }
  if (!user.id || !user.first_name) {
    throw new TelegramVerifyError("incomplete user data in initData");
  }

  return user;
}

/**
 * Test helper: build a valid initData string signed with the given bot token.
 * Mirrors what the Telegram client sends to a Mini App.
 */
export async function signInitDataForTests(params: {
  botToken: string;
  user: TelegramUser;
  authDate: number;
  extra?: Record<string, string>;
}): Promise<string> {
  const search = new URLSearchParams();
  search.set("auth_date", String(params.authDate));
  search.set("user", JSON.stringify(params.user));
  if (params.extra) {
    for (const [k, v] of Object.entries(params.extra)) search.set(k, v);
  }

  const checkString = [...search.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKeyBytes = await hmacSha256(enc.encode("WebAppData"), params.botToken);
  const signatureBytes = await hmacSha256(secretKeyBytes, checkString);
  const hash = toHex(signatureBytes);

  search.set("hash", hash);
  return search.toString();
}
