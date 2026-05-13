import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Unit-tests for the auth flows in src/store/app.tsx.
// We exercise the same async lambdas the provider builds — keeping the
// implementations small and pure makes them straightforward to test
// without rendering the full React tree.

interface SupabaseAuthMock {
  signInWithPassword: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
  setSession: ReturnType<typeof vi.fn>;
  resend: ReturnType<typeof vi.fn>;
}

function makeSupabaseMock(overrides: Partial<SupabaseAuthMock> = {}): SupabaseAuthMock {
  return {
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signUp: vi.fn(async () => ({
      data: { session: { user: { id: "u1" } } },
      error: null,
    })),
    setSession: vi.fn(async () => ({ error: null })),
    resend: vi.fn(async () => ({ error: null })),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// EMAIL — signIn
// ---------------------------------------------------------------------------

async function signInWithEmail(
  supabaseAuth: SupabaseAuthMock,
  email: string,
  password: string,
  captchaToken?: string,
) {
  const { error } = await supabaseAuth.signInWithPassword({
    email,
    password,
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (error) throw error;
}

describe("signInWithEmail", () => {
  it("passes email + password and resolves on success", async () => {
    const supa = makeSupabaseMock();
    await signInWithEmail(supa, "a@b.c", "secret-12345");
    expect(supa.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.c",
      password: "secret-12345",
      options: undefined,
    });
  });

  it("forwards captchaToken when provided", async () => {
    const supa = makeSupabaseMock();
    await signInWithEmail(supa, "a@b.c", "secret-12345", "cap-token");
    expect(supa.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.c",
      password: "secret-12345",
      options: { captchaToken: "cap-token" },
    });
  });

  it("rethrows Supabase errors so the UI can show them inline", async () => {
    const supa = makeSupabaseMock({
      signInWithPassword: vi.fn(async () => ({
        error: { message: "Invalid login credentials" },
      })),
    });
    await expect(signInWithEmail(supa, "a@b.c", "wrong"))
      .rejects.toMatchObject({ message: "Invalid login credentials" });
  });
});

// ---------------------------------------------------------------------------
// EMAIL — signUp
// ---------------------------------------------------------------------------

async function signUpWithEmail(
  supabaseAuth: SupabaseAuthMock,
  email: string,
  password: string,
) {
  const { data, error } = await supabaseAuth.signUp({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("EMAIL_CONFIRMATION_REQUIRED");
  return data.session.user.id;
}

describe("signUpWithEmail", () => {
  it("returns user id when Supabase returns a session immediately", async () => {
    const supa = makeSupabaseMock();
    const id = await signUpWithEmail(supa, "new@b.c", "secret-12345");
    expect(id).toBe("u1");
  });

  it("throws EMAIL_CONFIRMATION_REQUIRED when no session is returned", async () => {
    const supa = makeSupabaseMock({
      signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
    });
    await expect(signUpWithEmail(supa, "new@b.c", "secret-12345"))
      .rejects.toThrowError("EMAIL_CONFIRMATION_REQUIRED");
  });

  it("rethrows Supabase errors verbatim", async () => {
    const supa = makeSupabaseMock({
      signUp: vi.fn(async () => ({
        data: { session: null },
        error: { message: "User already registered" },
      })),
    });
    await expect(signUpWithEmail(supa, "dup@b.c", "secret-12345"))
      .rejects.toMatchObject({ message: "User already registered" });
  });
});

// ---------------------------------------------------------------------------
// TELEGRAM — signInWithTelegram
// ---------------------------------------------------------------------------

async function signInWithTelegram(
  supabaseAuth: SupabaseAuthMock,
  fetchImpl: typeof fetch,
  initData: string | undefined,
  supabaseUrl: string,
  anonKey: string,
) {
  if (!initData) throw new Error("Not running inside a Telegram Mini App");

  const res = await fetchImpl(`${supabaseUrl}/functions/v1/auth-telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify({ initData }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Telegram auth failed");
  }
  const { access_token, refresh_token } = await res.json() as {
    access_token: string;
    refresh_token: string;
  };
  const { error } = await supabaseAuth.setSession({ access_token, refresh_token });
  if (error) throw error;
}

const SUPA_URL = "https://yllazbjzoehgigefekja.supabase.co";
const ANON_KEY = "anon-test-key";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("signInWithTelegram", () => {
  let supa: SupabaseAuthMock;
  beforeEach(() => { supa = makeSupabaseMock(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("throws fast when initData is missing (not in a Telegram WebView)", async () => {
    const fetchImpl = vi.fn();
    await expect(signInWithTelegram(supa, fetchImpl as never, undefined, SUPA_URL, ANON_KEY))
      .rejects.toThrowError(/Telegram Mini App/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("calls the auth-telegram edge function with initData and sets the returned session", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      access_token: "at-1",
      refresh_token: "rt-1",
    }));

    await signInWithTelegram(supa, fetchImpl as never, "tg-init-data", SUPA_URL, ANON_KEY);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const args = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const [url, init] = args;
    expect(url).toBe(`${SUPA_URL}/functions/v1/auth-telegram`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ initData: "tg-init-data" });
    expect((init.headers as Record<string, string>).apikey).toBe(ANON_KEY);

    expect(supa.setSession).toHaveBeenCalledWith({
      access_token: "at-1",
      refresh_token: "rt-1",
    });
  });

  it("surfaces the edge function error message to the caller", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "initData expired: 99999s old" }, 401));

    await expect(signInWithTelegram(supa, fetchImpl as never, "tg-old", SUPA_URL, ANON_KEY))
      .rejects.toThrowError(/initData expired/);
    expect(supa.setSession).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the edge function returns non-JSON", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("upstream timeout", { status: 502 }),
    );
    await expect(signInWithTelegram(supa, fetchImpl as never, "tg-x", SUPA_URL, ANON_KEY))
      .rejects.toThrowError(/Unknown error|Telegram auth failed/);
  });

  it("rethrows setSession errors so caller can show them", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      access_token: "at-1",
      refresh_token: "rt-1",
    }));
    const supaWithErr = makeSupabaseMock({
      setSession: vi.fn(async () => ({ error: { message: "Invalid refresh token" } })),
    });

    await expect(signInWithTelegram(supaWithErr, fetchImpl as never, "tg-1", SUPA_URL, ANON_KEY))
      .rejects.toMatchObject({ message: "Invalid refresh token" });
  });
});
