import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { Trophy, Medal, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/app";
import { UserChallengesSheet } from "./UserChallengesSheet";

type Row = { user_id: string; name: string; photo_url?: string | null; score: number; you: boolean };

export const Leaderboard = () => {
  const { t } = useI18n();
  const { tab } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const me = user?.id ?? null;

      const [{ data: progress }, { data: profiles }] = await Promise.all([
        supabase.from("progress_entries").select("user_id,amount"),
        supabase.from("profiles").select("id,first_name,username,photo_url"),
      ]);

      const totals = new Map<string, number>();
      for (const p of progress ?? []) {
        totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + p.amount);
      }
      const profById = new Map((profiles ?? []).map((p) => [p.id, p]));
      const out: Row[] = [...totals.entries()].map(([user_id, score]) => {
        const prof = profById.get(user_id);
        return {
          user_id,
          name: prof?.first_name || prof?.username || "User",
          photo_url: prof?.photo_url,
          score,
          you: user_id === me,
        };
      }).sort((a, b) => b.score - a.score);
      setRows(out);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "leaderboard") loadRows();
  }, [tab, loadRows]);

  const sorted = rows;
  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div className="px-5 pt-12 pb-32">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{t("lb.thisMonth")}</p>
          <h1 className="text-2xl font-extrabold">{t("lb.title")}</h1>
        </div>
        <button
          onClick={loadRows}
          disabled={loading}
          className="h-9 w-9 rounded-full bg-card border border-border grid place-items-center disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      {sorted.length === 0 && loading ? (
        <div className="mt-12 space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl border border-border p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 bg-muted rounded-full" />
                <div className="h-3 w-1/3 bg-muted rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t("dash.empty") || "No data yet"}
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-3 gap-3 items-end">
            {[1, 0, 2].map((idx) => {
              const p = top[idx];
              if (!p) return <div key={idx} />;
              const isFirst = idx === 0;
              const displayName = p.you ? t("lb.you") : p.name;
              return (
                <button
                  type="button"
                  onClick={() => setSelected(p)}
                  key={p.user_id}
                  className={`rounded-3xl p-4 text-center transition active:scale-95 ${isFirst ? "bg-gradient-card text-primary-foreground shadow-card" : "bg-card border border-border shadow-soft"}`}
                >
                  <div className={`mx-auto h-12 w-12 rounded-full grid place-items-center ${isFirst ? "bg-background/20" : "bg-primary-soft"}`}>
                    {isFirst ? <Trophy className="h-6 w-6" /> : <Medal className="h-5 w-5 text-primary" />}
                  </div>
                  <p className="mt-2 font-bold text-sm truncate">{displayName}</p>
                  <p className={`text-xs ${isFirst ? "opacity-80" : "text-muted-foreground"}`}>{t("lb.points", { n: p.score })}</p>
                  <p className={`mt-1 text-[10px] font-bold ${isFirst ? "opacity-90" : "text-primary"}`}>#{idx + 1}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-3xl bg-card border border-border divide-y divide-border overflow-hidden shadow-soft">
            {rest.map((p, i) => (
              <button
                type="button"
                onClick={() => setSelected(p)}
                key={p.user_id}
                className={`w-full text-left flex items-center gap-4 p-4 transition active:bg-muted ${p.you ? "bg-primary-soft" : ""}`}
              >
                <span className="w-6 text-center font-bold text-muted-foreground">{i + 4}</span>
                <div className="h-10 w-10 rounded-full bg-secondary grid place-items-center font-bold overflow-hidden">
                  {p.photo_url ? <img src={p.photo_url} alt="" className="h-full w-full object-cover" /> : p.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{p.name}{p.you && <span className="ml-2 text-xs text-primary">{t("lb.you")}</span>}</p>
                  <p className="text-xs text-muted-foreground">{t("lb.points", { n: p.score })}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <UserChallengesSheet
        userId={selected?.user_id ?? null}
        userName={selected ? (selected.you ? t("lb.you") : selected.name) : ""}
        userPhoto={selected?.photo_url}
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
      />
    </div>
  );
};
