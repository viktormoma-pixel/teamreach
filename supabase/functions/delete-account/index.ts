// Deletes the currently authenticated user's auth account.
// All FK on delete cascade rows (profile, participants, progress) are wiped automatically.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Fail-closed CORS: ALLOWED_ORIGINS must be an explicit comma-separated list
// of https origins in prod. A missing/empty value blocks all cross-origin
// requests rather than silently opening the function to the world.
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null) {
  // Only echo Origin back when it's on the allowlist. Otherwise omit the
  // header entirely so the browser rejects the response.
  const allowed = origin && ALLOWED.includes(origin) ? origin : null;
  const base: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (allowed) base["Access-Control-Allow-Origin"] = allowed;
  return base;
}

function isOriginAllowed(origin: string | null) {
  return !!(origin && ALLOWED.includes(origin));
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (ALLOWED.length === 0) {
    // Misconfigured deployment — refuse rather than fall back to "*".
    return json({ error: "server misconfigured: ALLOWED_ORIGINS not set" }, 500, origin);
  }
  if (!isOriginAllowed(origin)) {
    return json({ error: "origin not allowed" }, 403, origin);
  }

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, origin);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY || !ANON) return json({ error: "env missing" }, 500, origin);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "missing authorization" }, 401, origin);

    // Validate JWT by asking Supabase who the user is
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401, origin);

    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: delErr.message }, 500, origin);

    return json({ ok: true }, 200, origin);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500, origin);
  }
});
