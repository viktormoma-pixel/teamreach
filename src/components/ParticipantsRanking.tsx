import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Participant } from "@/data/challenges";

const PAGE_SIZE = 5;

type Props = {
  participants: Participant[];
  youValue: number;
  unit: string;
};

export const ParticipantsRanking = ({ participants, youValue, unit }: Props) => {
  const { t } = useI18n();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const ranking = useMemo(() => {
    const list = [
      ...(participants ?? []).map((p) => ({ ...p, you: false })),
      { name: t("cd.you"), value: youValue, you: true },
    ];
    return list.sort((a, b) => b.value - a.value);
  }, [participants, youValue, t]);

  const max = Math.max(...ranking.map((r) => r.value), 1);
  const total = ranking.length;
  const shown = Math.min(visibleCount, total);
  const visible = ranking.slice(0, shown);
  const hasMore = shown < total;
  const canCollapse = shown > PAGE_SIZE;

  if (total === 0) {
    return (
      <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
        <p className="font-bold mb-4">{t("cd.ranking")}</p>
        <p className="text-sm text-muted-foreground text-center py-4">{t("cd.noParticipants")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
      <div className="flex items-baseline justify-between mb-4">
        <p className="font-bold">{t("cd.ranking")}</p>
        <p className="text-xs text-muted-foreground">{t("cd.showingOf", { n: shown, total })}</p>
      </div>

      <ol className="space-y-3">
        {visible.map((p, i) => {
          const pct = Math.round((p.value / max) * 100);
          return (
            <li key={`${p.name}-${i}`} className="flex items-center gap-3">
              <span className={`w-6 text-center text-sm font-bold ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                {i + 1}
              </span>
              <div className={`h-9 w-9 rounded-full grid place-items-center font-bold text-sm ${p.you ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {p.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <p className={`text-sm font-semibold truncate ${p.you ? "text-primary" : ""}`}>{p.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{p.value} {unit}</p>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${p.you ? "bg-gradient-primary" : "bg-foreground/30"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {(hasMore || canCollapse) && (
        <div className="mt-4 flex justify-center gap-2">
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-primary hover:text-primary"
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            >
              {t("cd.showMore")}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          )}
          {!hasMore && canCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-muted-foreground"
              onClick={() => setVisibleCount(PAGE_SIZE)}
            >
              {t("cd.showLess")}
              <ChevronUp className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
