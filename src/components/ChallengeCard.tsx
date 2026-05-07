import type { Challenge } from "@/data/challenges";
import { ChevronRight, Users } from "lucide-react";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";

const surfaceClass: Record<Challenge["surface"], string> = {
  blue: "bg-surface-blue text-surface-blue-foreground",
  mint: "bg-surface-mint text-surface-mint-foreground",
  peach: "bg-surface-peach text-surface-peach-foreground",
  lilac: "bg-surface-lilac text-surface-lilac-foreground",
};

export const ChallengeCard = ({
  c,
  onClick,
  onJoin,
}: {
  c: Challenge;
  onClick: () => void;
  onJoin?: () => void | Promise<void>;
}) => {
  const { t } = useI18n();
  const pct = Math.round((c.current / c.goal) * 100);
  const showJoin = !c.joined && !!onJoin;

  return (
    <button
      onClick={onClick}
      className={`${surfaceClass[c.surface]} w-full text-left rounded-3xl p-5 shadow-soft transition active:scale-[0.98]`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl">{c.emoji}</div>
          <h3 className="mt-2 font-bold text-lg leading-tight">{c.title}</h3>
          <div className="mt-1 text-xs opacity-70 flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {t("dash.members", { n: c.members })} · {t("dash.daysLeft", { n: c.daysLeft })}
          </div>
        </div>
        <div className="h-9 w-9 rounded-full bg-background/60 grid place-items-center">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      {c.joined ? (
        <div className="mt-5">
          <div className="flex justify-between text-sm font-semibold mb-1.5">
            <span>{c.current} / {c.goal} {c.unit}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-background/50 overflow-hidden">
            <div className="h-full bg-foreground/80 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : showJoin ? (
        <div className="mt-5 flex justify-end">
          <Button
            size="sm"
            className="rounded-full h-9 px-5"
            onClick={(e) => {
              e.stopPropagation();
              onJoin?.();
            }}
          >
            {t("dash.join")}
          </Button>
        </div>
      ) : null}
    </button>
  );
};
