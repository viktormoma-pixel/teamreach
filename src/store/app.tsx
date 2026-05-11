import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Challenge, Participant } from "@/data/challenges";

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
  signOut: () => Promise<void>;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  challenges: Challenge[];
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

// BUG FIX: removed unused `userId` param that was never used inside the function
function buildHistory(entries: { day: string; amount: number; created_at: string }[]) {
  const buckets: Record<string, number> = {};
  WEEKDAYS.forEach((d) => (buckets[d] = 0));
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [isAdmin, setIsAdminState] = useState(false);

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

  // --- challenges data fetch ---
  const refresh = useCallback(async () => {
    // Use getSession() — reads from local cache without a network round-trip.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const me = session.user.id;

    const { data: chs } = await supabase
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false });
    if (!chs) { setChallenges([]); return; }

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

    setChallenges(out);
  }, []);

  // --- Email auth ---
  // signInWithEmail: caller handles errors via try/catch for inline form feedback
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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
    // Session returned → SIGNED_IN event fires and handles the rest
  }, []);

  // --- Sign out ---
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // SIGNED_OUT event handled in onAuthStateChange below
  }, []);

  // --- App bootstrap ---
  useEffect(() => {
    try { setOnboardedState(localStorage.getItem(ONBOARD_KEY) === "1"); } catch {}

    // Listen for ongoing auth events (new sign-ins, token refresh, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (evt, session) => {
      if ((evt === "SIGNED_IN" || evt === "TOKEN_REFRESHED") && session?.user) {
        setAuth({ status: "authenticated", userId: session.user.id });
        await refreshAdmin(session.user.id);
        await refresh();
      } else if (evt === "SIGNED_OUT") {
        setAuth({ status: "unauthenticated" });
        setIsAdminState(false);
        setChallenges([]);
      }
    });

    (async () => {
      try {
        // Restore persisted email session if any
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          setAuth({ status: "authenticated", userId: data.session.user.id });
          await refreshAdmin(data.session.user.id);
          await refresh();
        } else {
          setAuth({ status: "unauthenticated" });
        }
      } catch (e) {
        console.error("[TeamReach] Auth initialization failed:", e);
        setAuth({ status: "unauthenticated" });
      }
    })();

    return () => { subscription.unsubscribe(); };
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
    if (error) throw error;
    await refresh();
  };

  const joinChallenge = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Optimistic update
    setChallenges((prev) =>
      prev.map((c) => c.id === id ? { ...c, joined: true, members: c.members + 1 } : c)
    );
    const { error } = await supabase
      .from("challenge_participants")
      .insert({ challenge_id: id, user_id: user.id });
    if (error && !String(error.message).includes("duplicate")) {
      // Rollback
      setChallenges((prev) =>
        prev.map((c) => c.id === id ? { ...c, joined: false, members: Math.max(0, c.members - 1) } : c)
      );
      throw error;
    }
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
    await refresh();
  };

  const deleteChallenge = async (id: string) => {
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) throw error;
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
        auth, signInWithEmail, signUpWithEmail, signOut,
        onboarded, setOnboarded,
        challenges, refresh,
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
