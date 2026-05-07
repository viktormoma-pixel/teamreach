import { useApp } from "@/store/app";
import { useI18n } from "@/i18n";
import { ChallengeCard } from "./ChallengeCard";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { CreateChallengeDialog } from "./CreateChallengeDialog";
import { supabase } from "@/integrations/supabase/client";

export const Dashboard = () => {
  const { challenges, setSelectedId, joinChallenge, isAdmin, auth } = useApp();
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [profile, setProfile] = useState<{ first_name?: string | null; username?: string | null; photo_url?: string | null } | null>(null);
  const mine = challenges.filter((c) => c.joined);
  const available = challenges.filter((c) => !c.joined);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name,username,photo_url")
        .eq("id", auth.userId)
        .maybeSingle();
      if (data) setProfile(data);
    })();
  }, [auth]);

  const displayName = profile?.first_name || profile?.username || "TeamReach";
  const initial = (profile?.first_name || profile?.username || "T").slice(0, 1).toUpperCase();

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
          {mine.length === 0 && (
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
          {available.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("dash.empty")}
            </div>
          )}
          {available.map((c) => (
            <ChallengeCard
              key={c.id}
              c={c}
              onClick={() => setSelectedId(c.id)}
              onJoin={async () => {
                try {
                  await joinChallenge(c.id);
                  toast.success(t("dash.joined", { title: c.title }));
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              }}
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
    </div>
  );
};
