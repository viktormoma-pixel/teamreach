import type { Challenge } from "@/data/challenges";
import { ChevronRight, Lock, Users, Flame } from "lucide-react";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { lastNDays, currentStreak } from "@/lib/streak";
import * as amplitude from "@amplitude/unified";

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
  isSubscriber,
  onPaywall,
}: {
  c: Challenge;
  onClick: () => void;
  onJoin?: () => void | Promise<void>;
  /** Whether the current user has an active premium subscription. */
  isSubscriber?: boolean;
  /** Called when a non-subscriber taps a subscribers-only challenge. */
  onPaywall?: () => void;
}) => {
  const { t } = useI18n();
  const pct = Math.round((c.current / c.goal) * 100);

  // Gate: lock the card when the challenge is subscribers-only, the user is
  // not a subscriber, and a paywall handler is provided (native only).
  const locked = c.subscribersOnly && !isSubscriber && !!onPaywall;
  const handleClick = locked
    ? () => {
        amplitude.track("Subscribers Only Challenge Viewed", { challenge_id: c.id });
        onPaywall!();
      }
    : onClick;

  const showJoin = !c.joined && !!onJoin && !locked;

  return (
    <button
      onClick={handleClick}
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
          {c.subscribersOnly || c.pinProtected ? (
            <Lock className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </div>

      {c.type === "streak" && c.joined ? (
        <div className="mt-5">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span>{c.current} / {c.goal} {t("streak.daysUnit")}</span>
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" /> {currentStreak(c.checkedDays)}
            </span>
          </div>
          <div className="flex gap-1.5">
            {lastNDays(7).map((d) => {
              const done = c.checkedDays?.includes(d);
              return (
                <span
                  key={d}
                  className={`h-2.5 flex-1 rounded-full ${done ? "bg-foreground/80" : "bg-background/50"}`}
                />
              );
            })}
          </div>
        </div>
      ) : c.joined ? (
        <div className="mt-5">
          <div className="flex justify-between text-sm font-semibold mb-1.5">
            <span>{c.current} / {c.goal} {c.unit}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-background/50 overflow-hidden">
            <div className="h-full bg-foreground/80 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : locked ? (
        <div className="mt-5 flex justify-end">
          <Button
            size="sm"
            className="rounded-full h-9 px-5 gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              amplitude.track("Subscribers Only Challenge Viewed", { challenge_id: c.id });
              onPaywall!();
            }}
          >
            <Lock className="h-3.5 w-3.5" />
            {t("sub.subscribe")}
          </Button>
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
