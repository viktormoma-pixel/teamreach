// Telegram WebApp authentication edge function
// Validates initData via HMAC-SHA256 with TELEGRAM_BOT_TOKEN, then issues a Supabase session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// In-memory rate limiter: 10 req/min per IP
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

async function hmacSha256(keyBytes: Uint8Array, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function validateInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false as const, reason: "missing hash" };
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  // secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
  const secretKey = await hmacSha256(
    new TextEncoder().encode("WebAppData"),
    botToken,
  );
  const computed = await hmacSha256(secretKey, dataCheckString);
  const computedHex = toHex(computed);

  if (computedHex !== hash) return { ok: false as const, reason: "bad hash" };

  // freshness check (24h)
  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > 86400) {
    return { ok: false as const, reason: "stale auth_date" };
  }

  const userJson = params.get("user");
  if (!userJson) return { ok: false as const, reason: "missing user" };
  const user = JSON.parse(userJson);
  return { ok: true as const, user };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // Rate limit: 10 req/min per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "rate limit exceeded" }), {
      status: 429,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Retry-After": String(rl.retryAfter),
      },
    });
  }

  try {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ADMIN_IDS = (Deno.env.get("ADMIN_TELEGRAM_IDS") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s))
      .map((s) => Number(s));

    if (!BOT_TOKEN) return json({ error: "TELEGRAM_BOT_TOKEN missing" }, 500);
    if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "Supabase env missing" }, 500);

    const body = await req.json().catch(() => null);
    const initData: string | undefined = body?.initData;
    if (!initData || typeof initData !== "string") {
      return json({ error: "initData required" }, 400);
    }

    const result = await validateInitData(initData, BOT_TOKEN);
    if (!result.ok) return json({ error: `invalid initData: ${result.reason}` }, 401);

    const tg = result.user as {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
      photo_url?: string;
      language_code?: string;
    };

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const syntheticEmail = `tg_${tg.id}@telegram.local`;

    // Check existing profile
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("telegram_id", tg.id)
      .maybeSingle();

    let userId = existingProfile?.id as string | undefined;

    if (!userId) {
      // Create auth user
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: {
          telegram_id: String(tg.id),
          username: tg.username ?? null,
          first_name: tg.first_name ?? null,
          last_name: tg.last_name ?? null,
          photo_url: tg.photo_url ?? null,
          language_code: tg.language_code ?? null,
          provider: "telegram",
        },
      });

      if (createErr || !created.user) {
        // Race / already exists — look up by synthetic email using the admin API filter
        // (avoids listUsers() which pages through ALL users and is slow/unsafe at scale)
        const { data: list } = await admin.auth.admin.listUsers({ perPage: 1, page: 1 });
        // listUsers doesn't support email filter in older SDK versions;
        // use getUserByEmail (admin API) instead which is O(1)
        const { data: byEmail } = await (admin.auth.admin as any).getUserByEmail?.(syntheticEmail) ??
          // Fallback for SDK versions without getUserByEmail: filter the single-page result
          { data: { user: list?.users?.find((u: { email: string }) => u.email === syntheticEmail) } };
        const found = byEmail?.user ?? byEmail;
        if (!found?.id) return json({ error: createErr?.message ?? "createUser failed" }, 500);
        userId = found.id;
      } else {
        userId = created.user.id;
      }
    } else {
      // Refresh profile data
      await admin
        .from("profiles")
        .update({
          username: tg.username ?? null,
          first_name: tg.first_name ?? null,
          last_name: tg.last_name ?? null,
          photo_url: tg.photo_url ?? null,
          language_code: tg.language_code ?? null,
        })
        .eq("id", userId);
    }

    // Ensure profile exists (in case trigger failed for any reason)
    await admin.from("profiles").upsert({
      id: userId,
      telegram_id: tg.id,
      username: tg.username ?? null,
      first_name: tg.first_name ?? null,
      last_name: tg.last_name ?? null,
      photo_url: tg.photo_url ?? null,
      language_code: tg.language_code ?? null,
    });

    // Admin role sync based on ADMIN_TELEGRAM_IDS
    const isAdmin = ADMIN_IDS.includes(tg.id);
    if (isAdmin) {
      await admin
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      // Revoke admin role if previously granted but no longer in the list
      await admin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
    }

    // Issue a session via magic link generation, then exchange? Easier: generate a session
    // using the admin's generateLink + verifyOtp pattern. But simplest: use signInWithPassword
    // is impossible (no password). Use admin.generateLink type=magiclink and parse tokens.
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
    });
    if (linkErr || !link) return json({ error: linkErr?.message ?? "link failed" }, 500);

    // The properties.hashed_token + email_otp can be exchanged via verifyOtp.
    const otp = (link.properties as { email_otp?: string }).email_otp;
    if (!otp) return json({ error: "no otp in link" }, 500);

    const { data: session, error: verifyErr } = await admin.auth.verifyOtp({
      email: syntheticEmail,
      token: otp,
      type: "magiclink",
    });
    if (verifyErr || !session.session) {
      return json({ error: verifyErr?.message ?? "verify failed" }, 500);
    }

    return json({
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
      user_id: userId,
      is_admin: !!isAdmin,
    }, 200);
  } catch (e) {
    console.error("telegram-auth error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
