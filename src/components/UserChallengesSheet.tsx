import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

type Props = {
  userId: string | null;
  userName: string;
  userPhoto?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Row = {
  challenge_id: string;
  title: string;
  emoji: string;
  unit: string;
  goal: number;
  score: number;
};

export const UserChallengesSheet = ({ userId, userName, userPhoto, open, onOpenChange }: Props) => {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: parts } = await supabase
          .from("challenge_participants")
          .select("challenge_id, challenges:challenge_id(id,title,emoji,unit,goal)")
          .eq("user_id", userId);

        const { data: progress } = await supabase
          .from("progress_entries")
          .select("challenge_id, amount")
          .eq("user_id", userId);

        const totals = new Map<string, number>();
        for (const p of progress ?? []) {
          totals.set(p.challenge_id, (totals.get(p.challenge_id) ?? 0) + p.amount);
        }

        const seen = new Set<string>();
        const out: Row[] = [];
        for (const p of parts ?? []) {
          const c = (p as unknown as { challenges: { id: string; title: string; emoji: string; unit: string; goal: number } | null }).challenges;
          if (!c) continue;
          seen.add(c.id);
          out.push({
            challenge_id: c.id,
            title: c.title,
            emoji: c.emoji,
            unit: c.unit,
            goal: c.goal,
            score: totals.get(c.id) ?? 0,
          });
        }

        const missingIds = [...totals.keys()].filter((id) => !seen.has(id));
        if (missingIds.length) {
          const { data: missing } = await supabase
            .from("challenges")
            .select("id,title,emoji,unit,goal")
            .in("id", missingIds);
          for (const c of missing ?? []) {
            out.push({
              challenge_id: c.id,
              title: c.title,
              emoji: c.emoji,
              unit: c.unit,
              goal: c.goal,
              score: totals.get(c.id) ?? 0,
            });
          }
        }

        out.sort((a, b) => b.score - a.score);
        if (!cancelled) setRows(out);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const total = rows.reduce((sum, r) => sum + r.score, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-secondary grid place-items-center font-bold overflow-hidden">
              {userPhoto ? <img src={userPhoto} alt="" className="h-full w-full object-cover" /> : userName[0]}
            </div>
            <div className="text-left">
              <SheetTitle className="text-lg">{userName}</SheetTitle>
              <p className="text-xs text-muted-foreground">
                {t("lb.totalScore")}: {t("lb.points", { n: total })}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-5 pb-6">
          <h3 className="text-sm font-semibold mb-3">{t("lb.userChallenges")}</h3>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-muted" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("lb.noChallenges")}
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => {
                const pct = r.goal > 0 ? Math.min(100, Math.round((r.score / r.goal) * 100)) : 0;
                return (
                  <li key={r.challenge_id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{r.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("lb.progressOf", { score: r.score, goal: r.goal, unit: r.unit })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-primary">{pct}%</span>
                    </div>
                    <Progress value={pct} className="mt-3 h-2" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
