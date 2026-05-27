import { useApp } from "@/store/app";
import { useI18n } from "@/i18n";
import { ChallengeCard } from "./ChallengeCard";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { CreateChallengeDialog } from "./CreateChallengeDialog";
import { PinEntryDialog } from "./PinEntryDialog";
import type { Challenge } from "@/data/challenges";
import { supabase } from "@/integrations/supabase/client";

export const Dashboard = () => {
  const { challenges, challengesReady, setSelectedId, joinChallenge, isAdmin, auth } = useApp();
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [pinTarget, setPinTarget] = useState<Challenge | null>(null);
  const [profile, setProfile] = useState<{ first_name?: string | null; username?: string | null; photo_url?: string | null; email?: string | null } | null>(null);
  const mine = challenges.filter((c) => c.joined);
  const available = challenges.filter((c) => !c.joined);

  const joinWithToast = async (c: Challenge) => {
    try {
      await joinChallenge(c.id);
      toast.success(t("dash.joined", { title: c.title }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  // PIN-protected challenges open the PIN gate first; the rest join directly.
  const requestJoin = (c: Challenge) => {
    if (c.pinProtected) {
      setPinTarget(c);
      return;
    }
    void joinWithToast(c);
  };

  useEffect(() => {
    if (auth.status !== "authenticated") {
      setProfile(null);
      return;
    }
    let cancelled = false;
    const targetId = auth.userId;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled) return;
      const authEmail = userData?.user?.email ?? null;
      const { data } = await supabase
        .from("profiles")
        .select("first_name,username,photo_url,email")
        .eq("id", targetId)
        .maybeSingle();
      if (cancelled) return;
      setProfile({
        first_name: data?.first_name ?? null,
        username: data?.username ?? null,
        photo_url: data?.photo_url ?? null,
        email: data?.email ?? authEmail,
      });
    })();
    return () => { cancelled = true; };
  }, [auth]);

  // Greeting falls back to the email local-part, then to a neutral label.
  // Skip the email local-part for synthetic Telegram emails (e.g. 851922@tg.local) —
  // those would surface a meaningless numeric ID instead of a real name.
  const isTelegramEmail = profile?.email
    ? /@(?:tg\.|telegram\.)/i.test(profile.email)
    : false;
  const emailLocal = profile?.email && !isTelegramEmail ? profile.email.split("@")[0] : null;
  const tgHandle = profile?.username ? `@${profile.username}` : null;
  const displayName = profile?.first_name || tgHandle || emailLocal || "TeamReach";
  const initial = (profile?.first_name || profile?.username || emailLocal || "T").slice(0, 1).toUpperCase();

  return (
    <div className="px-5 pt-12 pb-32">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-primary grid place-items-center text-primary-foreground font-black text-lg overflow-hidden">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight truncate max-w-[220px]">{t("dash.greeting", { name: displayName })}</h1>
          </div>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-2xl font-extrabold leading-tight whitespace-pre-line">
          {t("dash.headline")}
        </h2>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base">{t("dash.myChallenges")}</h3>
          <span className="text-sm text-muted-foreground">{t("dash.active", { n: mine.length })}</span>
        </div>
        <div className="space-y-3">
          {!challengesReady && (
            <div className="rounded-3xl border border-border p-6 space-y-2 animate-pulse">
              <div className="h-4 w-2/3 bg-muted rounded-full" />
              <div className="h-3 w-1/2 bg-muted rounded-full" />
            </div>
          )}
          {challengesReady && mine.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("dash.empty")}
            </div>
          )}
          {mine.map((c) => (
            <ChallengeCard key={c.id} c={c} onClick={() => setSelectedId(c.id)} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base">{t("dash.available")}</h3>
        </div>
        <div className="space-y-3">
          {!challengesReady && (
            <div className="rounded-3xl border border-border p-6 space-y-2 animate-pulse">
              <div className="h-4 w-2/3 bg-muted rounded-full" />
              <div className="h-3 w-1/2 bg-muted rounded-full" />
            </div>
          )}
          {challengesReady && available.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("dash.empty")}
            </div>
          )}
          {available.map((c) => (
            <ChallengeCard
              key={c.id}
              c={c}
              onClick={() => setSelectedId(c.id)}
              onJoin={() => requestJoin(c)}
            />
          ))}
        </div>
      </section>

      {isAdmin && (
        <>
          <button
            onClick={() => setCreateOpen(true)}
            className="fixed bottom-24 right-5 h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-card hover:bg-primary/90 transition z-40"
            style={{ right: "max(1.25rem, calc((100vw - 28rem) / 2 + 1.25rem))" }}
            aria-label={t("dash.createAria")}
          >
            <Plus className="h-6 w-6" />
          </button>
          <CreateChallengeDialog open={createOpen} onOpenChange={setCreateOpen} />
        </>
      )}

      <PinEntryDialog
        challengeId={pinTarget?.id ?? null}
        open={!!pinTarget}
        onOpenChange={(v) => { if (!v) setPinTarget(null); }}
        onVerified={async () => {
          if (pinTarget) {
            const target = pinTarget;
            setPinTarget(null);
            await joinWithToast(target);
          }
        }}
      />
    </div>
  );
};
