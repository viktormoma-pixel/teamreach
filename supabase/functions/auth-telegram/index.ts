// Edge Function: auth-telegram
//
// Validates a Telegram Mini App initData payload (HMAC-SHA256),
// finds or creates a Supabase user whose email is <telegram_id>@telegram.ommos.io,
// and returns a fresh access_token + refresh_token pair.
//
// Required Supabase Secrets:
//   TELEGRAM_BOT_TOKEN   — your bot token from @BotFather
//   ALLOWED_ORIGINS      — comma-separated list of allowed https origins
//   SUPABASE_URL         — injected automatically by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — injected automatically by Supabase
//
// Optional Supabase Secrets:
//   TELEGRAM_AUTH_MAX_AGE_SECONDS — max age of initData in seconds (default: 3600)
//   TELEGRAM_EMAIL_DOMAIN         — fake email domain for Telegram users (default: telegram.ommos.io)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED.includes(origin) ? origin : null;
  const base: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (allowed) base["Access-Control-Allow-Origin"] = allowed;
  return base;
}

function isOriginAllowed(origin: string | null): boolean {
  return !!(origin && ALLOWED.includes(origin));
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Telegram initData verification (per Telegram docs)
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// ---------------------------------------------------------------------------

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

async function verifyAndParseInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number,
): Promise<TelegramUser> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("missing hash in initData");

  // Build data-check-string: all fields except hash, sorted alphabetically
  params.delete("hash");
  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // secret_key = HMAC-SHA256(key="WebAppData", data=botToken)
  const enc = new TextEncoder();
  const secretKeyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const secretKeyBytes = await crypto.subtle.sign(
    "HMAC",
    secretKeyMaterial,
    enc.encode(botToken),
  );

  // computed_hash = HMAC-SHA256(key=secret_key, data=checkString)
  const dataKey = await crypto.subtle.importKey(
    "raw",
    secretKeyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    dataKey,
    enc.encode(checkString),
  );
  const computedHash = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedHash !== hash) throw new Error("initData signature invalid");

  // Check auth_date freshness
  const authDateStr = params.get("auth_date");
  if (!authDateStr) throw new Error("missing auth_date in initData");
  const authDate = parseInt(authDateStr, 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > maxAgeSeconds) {
    throw new Error(`initData expired: ${now - authDate}s old (max ${maxAgeSeconds}s)`);
  }

  // Parse user object
  const userStr = params.get("user");
  if (!userStr) throw new Error("missing user in initData");
  let user: TelegramUser;
  try {
    user = JSON.parse(userStr) as TelegramUser;
  } catch {
    throw new Error("invalid user JSON in initData");
  }
  if (!user.id || !user.first_name) throw new Error("incomplete user data in initData");

  return user;
}

// ---------------------------------------------------------------------------
// Find or create a Supabase user for a given Telegram ID
// ---------------------------------------------------------------------------

async function findOrCreateTelegramUser(
  admin: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
  telegramUser: TelegramUser,
  emailDomain: string,
): Promise<string> {
  const fakeEmail = `${telegramUser.id}@${emailDomain}`;

  // Attempt to create a new user. If the email already exists we get a 422
  // "already been registered" error and fall through to lookup.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: fakeEmail,
    email_confirm: true,
    user_metadata: {
      telegram_id: String(telegramUser.id),
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name ?? null,
      username: telegramUser.username ?? null,
    },
  });

  if (!createErr) return created.user.id;

  // User already exists — look them up via the admin REST API.
  // NOTE: for very large user bases, replace this with a dedicated
  // Postgres function that queries auth.users by email using an index.
  if (!createErr.message.toLowerCase().includes("already been registered")) {
    throw new Error(`createUser failed: ${createErr.message}`);
  }

  const searchRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  if (!searchRes.ok) {
    throw new Error(`user list failed: ${searchRes.status}`);
  }
  const searchData = await searchRes.json() as { users: Array<{ id: string; email: string }> };
  const existing = searchData.users?.find((u) => u.email === fakeEmail);
  if (!existing) throw new Error("user not found after create collision");
  return existing.id;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (ALLOWED.length === 0) {
    return json({ error: "server misconfigured: ALLOWED_ORIGINS not set" }, 500, origin);
  }
  if (!isOriginAllowed(origin)) {
    return json({ error: "origin not allowed" }, 403, origin);
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405, origin);
  }

  try {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!BOT_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
      return json({ error: "server misconfigured: env vars missing" }, 500, origin);
    }

    const MAX_AGE = parseInt(
      Deno.env.get("TELEGRAM_AUTH_MAX_AGE_SECONDS") ?? "3600",
      10,
    );
    const EMAIL_DOMAIN = Deno.env.get("TELEGRAM_EMAIL_DOMAIN") ?? "telegram.ommos.io";

    // Parse body
    let body: { initData?: unknown };
    try {
      body = await req.json() as { initData?: unknown };
    } catch {
      return json({ error: "invalid JSON body" }, 400, origin);
    }
    if (typeof body.initData !== "string" || body.initData.length > 4096) {
      return json({ error: "initData must be a non-empty string ≤ 4096 chars" }, 400, origin);
    }

    // Verify Telegram initData
    let telegramUser: TelegramUser;
    try {
      telegramUser = await verifyAndParseInitData(body.initData, BOT_TOKEN, MAX_AGE);
    } catch (err) {
      return json(
        { error: err instanceof Error ? err.message : "initData verification failed" },
        401,
        origin,
      );
    }

    // Build admin client (service role — never exposed to clients)
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Find or create user
    let userId: string;
    try {
      userId = await findOrCreateTelegramUser(
        admin,
        SUPABASE_URL,
        SERVICE_KEY,
        telegramUser,
        EMAIL_DOMAIN,
      );
    } catch (err) {
      return json(
        { error: err instanceof Error ? err.message : "user setup failed" },
        500,
        origin,
      );
    }

    // Issue a fresh session for the user
    const { data: sessionData, error: sessionErr } = await admin.auth.admin.createSession({
      user_id: userId,
    });
    if (sessionErr || !sessionData?.session) {
      return json({ error: sessionErr?.message ?? "session creation failed" }, 500, origin);
    }

    return json(
      {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        telegram_id: String(telegramUser.id),
        first_name: telegramUser.first_name,
        username: telegramUser.username ?? null,
      },
      200,
      origin,
    );
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500, origin);
  }
});
