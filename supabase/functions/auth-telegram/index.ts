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
//
// Telegram Mobile WebView sends requests without an Origin header (or with
// null). Security here is provided entirely by the HMAC-SHA256 signature
// check on initData — there is nothing to steal without the BOT_TOKEN, so
// an open CORS policy is safe for this specific endpoint.
// ---------------------------------------------------------------------------

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
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
  telegramUser: TelegramUser,
  emailDomain: string,
): Promise<string> {
  const fakeEmail = `${telegramUser.id}@${emailDomain}`;

  // Try to find the user first — avoids a create+collision roundtrip for
  // returning users, and scales to any number of accounts.
  const { data: existing } = await admin.auth.admin.getUserByEmail(fakeEmail);
  if (existing?.user) return existing.user.id;

  // New user — create them.
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

  // Race: another request created the user between our lookup and createUser.
  // Look up once more to get their id.
  if (!createErr.message.toLowerCase().includes("already been registered")) {
    throw new Error(`createUser failed: ${createErr.message}`);
  }
  const { data: retry } = await admin.auth.admin.getUserByEmail(fakeEmail);
  if (retry?.user) return retry.user.id;
  throw new Error("user not found after create collision");
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  try {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!BOT_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
      return json({ error: "server misconfigured: env vars missing" }, 500);
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
      return json({ error: "invalid JSON body" }, 400);
    }
    if (typeof body.initData !== "string" || body.initData.length > 4096) {
      return json({ error: "initData must be a non-empty string ≤ 4096 chars" }, 400);
    }

    // Verify Telegram initData
    let telegramUser: TelegramUser;
    try {
      telegramUser = await verifyAndParseInitData(body.initData, BOT_TOKEN, MAX_AGE);
    } catch (err) {
      return json(
        { error: err instanceof Error ? err.message : "initData verification failed" },
        401,
      );
    }

    // Build admin client (service role — never exposed to clients)
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Find or create user (ensures the Supabase account exists before issuing the link)
    let userId: string;
    try {
      userId = await findOrCreateTelegramUser(admin, telegramUser, EMAIL_DOMAIN);
    } catch (err) {
      return json(
        { error: err instanceof Error ? err.message : "user setup failed" },
        500,
      );
    }

    // Upsert profile fields from Telegram on every login so name/username/photo
    // stay in sync (and backfill rows created before these fields were captured).
    // Do NOT overwrite first_name if user has customized it: we only set it when
    // it's currently null/empty.
    try {
      const { data: existing } = await admin
        .from("profiles")
        .select("first_name")
        .eq("id", userId)
        .maybeSingle();

      const patch: Record<string, unknown> = {
        id: userId,
        telegram_id: telegramUser.id,
        username: telegramUser.username ?? null,
        last_name: telegramUser.last_name ?? null,
        language_code: telegramUser.language_code ?? null,
      };
      if (!existing?.first_name) {
        patch.first_name = telegramUser.first_name;
      }
      await admin.from("profiles").upsert(patch, { onConflict: "id" });
    } catch (err) {
      console.error("[auth-telegram] profile upsert failed:", err);
    }

    // Issue a fresh session via magic link — admin.createSession doesn't exist in
    // supabase-js; instead we generate a sign-in link and follow its redirect to
    // extract the access_token / refresh_token from the Location fragment.
    const fakeEmail = `${telegramUser.id}@${EMAIL_DOMAIN}`;
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: fakeEmail,
      options: { redirectTo: SUPABASE_URL },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      return json({ error: linkErr?.message ?? "generateLink failed" }, 500);
    }

    // Follow the verify redirect (manual) to capture tokens from the Location fragment
    const verifyRes = await fetch(linkData.properties.action_link, { redirect: "manual" });
    const location = verifyRes.headers.get("location") ?? "";
    const hashIdx = location.indexOf("#");
    const fragment = hashIdx >= 0 ? location.slice(hashIdx + 1) : "";
    const fragParams = new URLSearchParams(fragment);
    const access_token = fragParams.get("access_token");
    const refresh_token = fragParams.get("refresh_token");

    if (!access_token || !refresh_token) {
      const errDesc = fragParams.get("error_description") ?? fragParams.get("error") ?? "no tokens in redirect";
      return json({ error: `session extraction failed: ${errDesc}` }, 500);
    }

    return json(
      {
        access_token,
        refresh_token,
        telegram_id: String(telegramUser.id),
        first_name: telegramUser.first_name,
        username: telegramUser.username ?? null,
      },
      200,
    );
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500);
  }
});
