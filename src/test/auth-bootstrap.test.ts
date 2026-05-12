import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression test for the "empty account first, real account after refresh" bug.
// Root cause was a race: the explicit getSession() bootstrap and the
// INITIAL_SESSION auth event both fired applySession concurrently, each
// kicking off a refresh() that flipped challengesReady false→true→false→true
// and sometimes returned stale/empty data.
//
// The fix dedupes applySession by the session's user id, so only the first
// caller for a given user actually runs refresh().

type Session = { user: { id: string } } | null;

function makeDedupedBootstrap() {
  let lastAppliedUserId: string | null | undefined = undefined;
  let refreshCalls = 0;

  const refresh = vi.fn(async () => {
    refreshCalls++;
  });

  const applySession = async (
    session: Session,
    opts?: { force?: boolean },
  ) => {
    const nextUserId = session?.user?.id ?? null;
    if (!opts?.force && nextUserId === lastAppliedUserId) return;
    lastAppliedUserId = nextUserId;
    if (session?.user) await refresh();
  };

  return { applySession, refresh, getCalls: () => refreshCalls };
}

describe("auth bootstrap dedup", () => {
  let bootstrap: ReturnType<typeof makeDedupedBootstrap>;

  beforeEach(() => {
    bootstrap = makeDedupedBootstrap();
  });

  it("runs refresh once when getSession() and INITIAL_SESSION fire for the same user", async () => {
    const session: Session = { user: { id: "user-1" } };
    await Promise.all([
      bootstrap.applySession(session), // explicit bootstrap
      bootstrap.applySession(session), // INITIAL_SESSION event
    ]);
    expect(bootstrap.getCalls()).toBe(1);
  });

  it("re-runs refresh on user change", async () => {
    await bootstrap.applySession({ user: { id: "user-1" } });
    await bootstrap.applySession({ user: { id: "user-2" } });
    expect(bootstrap.getCalls()).toBe(2);
  });

  it("does not run refresh for null session, but resets on next sign-in", async () => {
    await bootstrap.applySession(null);
    expect(bootstrap.getCalls()).toBe(0);
    await bootstrap.applySession({ user: { id: "user-1" } });
    expect(bootstrap.getCalls()).toBe(1);
  });

  it("forces re-apply when force flag is set (PASSWORD_RECOVERY)", async () => {
    const session: Session = { user: { id: "user-1" } };
    await bootstrap.applySession(session);
    await bootstrap.applySession(session, { force: true });
    expect(bootstrap.getCalls()).toBe(2);
  });
});

describe("refresh token guard", () => {
  // Models the refreshTokenRef pattern in app.tsx: each refresh increments a
  // counter; the first caller's writes are dropped if a newer refresh started.
  it("only the latest refresh writes to state", async () => {
    let token = 0;
    const writes: string[] = [];

    async function refresh(label: string, delayMs: number) {
      const myToken = ++token;
      await new Promise((r) => setTimeout(r, delayMs));
      if (myToken !== token) return;
      writes.push(label);
    }

    // Start a slow refresh, then a fast one that should win.
    await Promise.all([refresh("slow", 30), refresh("fast", 5)]);
    expect(writes).toEqual(["fast"]);
  });
});
