import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Challenge, Participant } from "@/data/challenges";
import { mixpanel } from "@/lib/mixpanel";

type Tab = "home" | "leaderboard" | "settings";

export type NewChallengeInput = {
  title: string;
  emoji?: string;
  unit: string;
  goal: number;
  daysLeft: number;
  surface?: Challenge["surface"];
};

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; userId: string };

type AppContextValue = {
  auth: AuthState;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  passwordRecovery: boolean;
  exitPasswordRecovery: () => void;
  signOut: () => Promise<void>;
  signInWithTelegram: () => Promise<void>;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  challenges: Challenge[];
  challengesReady: boolean;
  refresh: () => Promise<void>;
  addProgress: (id: string, amount: number) => Promise<void>;
  joinChallenge: (id: string) => Promise<void>;
  createChallenge: (input: NewChallengeInput) => Promise<void>;
  deleteChallenge: (id: string) => Promise<void>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  resetAll: () => Promise<void>;
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

// Constants defined outside component to avoid recreation on every render
const SURFACES: Challenge["surface"][] = ["blue", "mint", "peach", "lilac"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ONBOARD_KEY = "teamreach.onboarded";

// --- helpers ----------------------------------------------------------------

// Buckets the last 7 calendar days (in the user's local TZ) of progress
// entries by weekday. The cutoff is the start of "today - 6 days" so the
// returned week always spans exactly 7 calendar days regardless of the
// current time of day — avoids the off-by-one drift the wall-clock cutoff
// caused near midnight.
function buildHistory(entries: { day: string; amount: number; created_at: string }[]) {
  const buckets: Record<string, number> = {};
  WEEKDAYS.forEach((d) => (buckets[d] = 0));

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const cutoff = startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000;

  for (const e of entries) {
    const ts = new Date(e.created_at).getTime();
    if (ts < cutoff) continue;
    const day = WEEKDAYS[new Date(e.created_at).getDay()];
    buckets[day] = (buckets[day] ?? 0) + e.amount;
  }
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
    day,
    value: buckets[day] ?? 0,
  }));
}

function daysLeftFromDeadline(deadline: string) {
  const d = new Date(deadline);
  const now = new Date();
  const ms = d.getTime() - now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

// ---------------------------------------------------------------------------

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [onboarded, setOnboardedState] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengesReady, setChallengesReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [isAdmin, setIsAdminState] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const setOnboarded = (v: boolean) => {
    setOnboardedState(v);
    try { localStorage.setItem(ONBOARD_KEY, v ? "1" : "0"); } catch {}
  };

  // --- admin role sync (reads user_roles table) ---
  const refreshAdmin = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setIsAdminState(!!data?.some((r) => r.role === "admin"));
  }, []);

  // Per-call token: lets us discard results from stale concurrent refreshes.
  const refreshTokenRef = useRef(0);

  // --- challenges data fetch ---
  const refresh = useCallback(async () => {
    const myToken = ++refreshTokenRef.current;
    const isLatest = () => myToken === refreshTokenRef.current;

    // Always release the skeleton, even if every query below fails. Otherwise
    // a single network blip (common inside in-app WebViews) freezes the UI on
    // the loading state forever.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !isLatest()) return;
      const me = session.user.id;

      const { data: chs, error: chErr } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });
      if (chErr) console.error("[TeamReach] challenges fetch failed:", chErr);
      if (!isLatest()) return;
      if (!chs) {
        setChallenges([]);
        return;
      }

      const ids = chs.map((c) => c.id);
      const safeIds = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];

      const [{ data: parts }, { data: progress }, { data: profiles }] = await Promise.all([
        supabase.from("challenge_participants").select("challenge_id,user_id").in("challenge_id", safeIds),
        supabase.from("progress_entries").select("challenge_id,user_id,amount,day,created_at").in("challenge_id", safeIds),
        supabase.from("profiles").select("id,first_name,username,photo_url"),
      ]);

      const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));

      const out: Challenge[] = chs.map((c) => {
        const cParts = (parts ?? []).filter((p) => p.challenge_id === c.id);
        const cProgress = (progress ?? []).filter((p) => p.challenge_id === c.id);

        const totals = new Map<string, number>();
        for (const p of cProgress) totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + p.amount);

        const myTotal = totals.get(me) ?? 0;
        const totalAll = cProgress.reduce((s, p) => s + p.amount, 0);

        const participants: Participant[] = cParts
          .filter((p) => p.user_id !== me)
          .map((p) => {
            const prof = profilesById.get(p.user_id);
            return {
              name: prof?.first_name || prof?.username || "User",
              avatar: prof?.photo_url ?? undefined,
              value: totals.get(p.user_id) ?? 0,
            };
          });

        const myEntries = cProgress.filter((p) => p.user_id === me);

        return {
          id: c.id,
          title: c.title,
          emoji: c.emoji,
          unit: c.unit,
          goal: c.goal,
          current: Math.min(c.goal, myTotal),
          totalAll,
          daysLeft: daysLeftFromDeadline(c.deadline),
          surface: (c.surface as Challenge["surface"]) ?? "blue",
          joined: cParts.some((p) => p.user_id === me),
          members: cParts.length,
          history: buildHistory(myEntries),
          participants,
        };
      });

      if (!isLatest()) return;
      setChallenges(out);
    } catch (err) {
      console.error("[TeamReach] refresh() failed:", err);
    } finally {
      // Always clear the skeleton for the latest refresh, even on error.
      if (isLatest()) setChallengesReady(true);
    }
  }, []);

  // --- Email auth ---
  // signInWithEmail: caller handles errors via try/catch for inline form feedback
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    mixpanel.track("signed_in", { method: "email" });
    // onAuthStateChange (SIGNED_IN) will update auth state, admin, and challenges
  }, []);

  // signUpWithEmail: throws EMAIL_CONFIRMATION_REQUIRED if Supabase requires email verify
  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.session) {
      // Email confirmation is enabled in Supabase → user must verify email first
      throw new Error("EMAIL_CONFIRMATION_REQUIRED");
    }
    // Identify before tracking so sign_up_completed is attributed to this user
    mixpanel.identify(data.session.user.id);
    mixpanel.people.set({ $email: email, $created: new Date().toISOString() });
    mixpanel.track("sign_up_completed", { sign_up_method: "email" });
    // Session returned → SIGNED_IN event fires and handles the rest
  }, []);

  // --- Resend confirmation email ---
  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) throw error;
  }, []);

  // --- Telegram Mini App auth ---
  const signInWithTelegram = useCallback(async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) throw new Error("Not running inside a Telegram Mini App");

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
    const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-telegram`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON,
      },
      body: JSON.stringify({ initData }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error((err as { error?: string }).error ?? "Telegram auth failed");
    }

    const { access_token, refresh_token } = await res.json() as {
      access_token: string;
      refresh_token: string;
    };

    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;

    mixpanel.track("signed_in", { method: "telegram" });
    // onAuthStateChange (SIGNED_IN) will update auth state and load challenges
  }, []);

  // --- Password reset ---
  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setPasswordRecovery(false);
  }, []);

  const exitPasswordRecovery = useCallback(() => setPasswordRecovery(false), []);

  // --- Sign out ---
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // SIGNED_OUT event handled in onAuthStateChange below
  }, []);

  // --- App bootstrap ---
  useEffect(() => {
    try { setOnboardedState(localStorage.getItem(ONBOARD_KEY) === "1"); } catch {}

    let cancelled = false;
    // Dedupe applySession across the explicit getSession() bootstrap and the
    // INITIAL_SESSION / SIGNED_IN / TOKEN_REFRESHED events for the same user.
    let lastAppliedUserId: string | null | undefined = undefined;

    const applySession = async (
      session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"],
      opts?: { force?: boolean },
    ) => {
      if (cancelled) return;
      const nextUserId = session?.user?.id ?? null;
      if (!opts?.force && nextUserId === lastAppliedUserId) return;
      lastAppliedUserId = nextUserId;

      if (session?.user) {
        // Detect orphan / Telegram-era sessions. Those users either have
        // synthetic @telegram.local emails or no email at all (older Telegram
        // signInWithIdToken flow), and they have no usable profile row in
        // the email-only schema. Force them to sign in fresh with email.
        const email = session.user.email ?? "";
        const isStale = !email || email.endsWith("@telegram.local");
        if (isStale) {
          console.warn("[TeamReach] dropping stale legacy session", { email });
          await supabase.auth.signOut();
          return;
        }
        setAuth({ status: "authenticated", userId: session.user.id });
        mixpanel.identify(session.user.id);
        mixpanel.people.set({ $email: session.user.email });
        setChallengesReady(false);
        try {
          await refreshAdmin(session.user.id);
        } catch (err) {
          console.error("[TeamReach] refreshAdmin failed:", err);
        }
        await refresh();
      } else {
        setAuth({ status: "unauthenticated" });
      }
    };

    // Explicit bootstrap: in some in-app browsers INITIAL_SESSION fires late
    // or not at all, leaving the UI stuck on the loader.
    supabase.auth.getSession().then(({ data }) => applySession(data.session));

    // Supabase documents that calling any supabase.* method synchronously
    // inside this callback can deadlock the auth client — especially in
    // in-app WebViews (Telegram, iOS Safari). Defer all async work to a
    // microtask via setTimeout(0); keep only synchronous state updates inline.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setTimeout(() => { void applySession(session, { force: true }); }, 0);
      } else if (evt === "SIGNED_IN" || evt === "INITIAL_SESSION") {
        setTimeout(() => { void applySession(session); }, 0);
      } else if (evt === "TOKEN_REFRESHED") {
        // Token refresh doesn't change the user — skip the full refetch.
        if (session?.user) {
          lastAppliedUserId = session.user.id;
          setAuth({ status: "authenticated", userId: session.user.id });
        }
      } else if (evt === "SIGNED_OUT") {
        lastAppliedUserId = null;
        setPasswordRecovery(false);
        setAuth({ status: "unauthenticated" });
        setIsAdminState(false);
        setChallenges([]);
        setChallengesReady(false);
        mixpanel.reset();
      }
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Challenge mutations ---
  const addProgress = async (id: string, amount: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const day = WEEKDAYS[new Date().getDay()];
    const { error } = await supabase.from("progress_entries").insert({
      challenge_id: id, user_id: user.id, amount, day,
    });
    if (error) {
      // Map server-side abuse-limit raises to stable error codes the UI can
      // translate. The Postgres trigger raises with errcode=23514 (check_violation).
      const msg = String(error.message || "");
      if (msg.includes("progress_daily_cap_exceeded")) {
        throw new Error("PROGRESS_DAILY_CAP");
      }
      if (msg.includes("progress_daily_total_exceeded")) {
        throw new Error("PROGRESS_DAILY_TOTAL");
      }
      throw error;
    }
    mixpanel.track("progress_logged", { challenge_id: id, amount });
    await refresh();
  };

  const joinChallenge = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Skip optimistic bump if the user is already joined — otherwise a
    // duplicate insert leaves members count inflated until refresh().
    const alreadyJoined = challenges.find((c) => c.id === id)?.joined === true;

    if (!alreadyJoined) {
      setChallenges((prev) =>
        prev.map((c) => c.id === id ? { ...c, joined: true, members: c.members + 1 } : c)
      );
    }

    const { error } = await supabase
      .from("challenge_participants")
      .insert({ challenge_id: id, user_id: user.id });

    if (error && !String(error.message).includes("duplicate")) {
      if (!alreadyJoined) {
        // Rollback only the increment we applied.
        setChallenges((prev) =>
          prev.map((c) => c.id === id ? { ...c, joined: false, members: Math.max(0, c.members - 1) } : c)
        );
      }
      throw error;
    }
    if (!alreadyJoined) mixpanel.track("challenge_joined", { challenge_id: id });
    await refresh();
  };

  const createChallenge = async (input: NewChallengeInput) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + input.daysLeft);
    const surface = input.surface ?? SURFACES[Math.floor(Math.random() * SURFACES.length)];

    const { data: ch, error } = await supabase.from("challenges").insert({
      title: input.title,
      emoji: input.emoji?.trim() || "🎯",
      unit: input.unit,
      goal: input.goal,
      deadline: deadline.toISOString().slice(0, 10),
      surface,
      created_by: user.id,
    }).select("id").single();
    if (error) throw error;

    // Auto-join creator
    if (ch?.id) {
      await supabase.from("challenge_participants").insert({ challenge_id: ch.id, user_id: user.id });
    }
    mixpanel.track("challenge_created", { unit: input.unit, goal: input.goal, days: input.daysLeft });
    await refresh();
  };

  const deleteChallenge = async (id: string) => {
    // Soft-delete: marking archived_at hides the challenge from RLS reads but
    // keeps participants + progress rows intact. A future "restore" UI can
    // unset archived_at to recover the challenge.
    const { error } = await supabase
      .from("challenges")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    mixpanel.track("challenge_deleted", { challenge_id: id });
    setSelectedId(null);
    await refresh();
  };

  const resetAll = async () => {
    try { localStorage.removeItem(ONBOARD_KEY); } catch {}
    setOnboardedState(false);
    setSelectedId(null);
    setTab("home");
    await signOut();
  };

  // No-op: roles are managed server-side only. Kept for backwards compat.
  const setIsAdmin = (_v: boolean) => {};

  return (
    <AppContext.Provider
      value={{
        auth, signInWithEmail, signUpWithEmail, resendConfirmation, sendPasswordReset, updatePassword,
        passwordRecovery, exitPasswordRecovery, signOut, signInWithTelegram,
        onboarded, setOnboarded,
        challenges, challengesReady, refresh,
        addProgress, joinChallenge, createChallenge, deleteChallenge,
        selectedId, setSelectedId, tab, setTab,
        resetAll, isAdmin, setIsAdmin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
};
