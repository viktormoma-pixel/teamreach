import { useEffect, useRef, useState } from "react";
import { useApp } from "@/store/app";
import { useI18n } from "@/i18n";
import * as amplitude from "@amplitude/unified";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Flame, Users, Calendar, Trash2, Loader2, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { ParticipantsRanking } from "./ParticipantsRanking";
import { PinEntryDialog } from "./PinEntryDialog";
import { lastNDays, daysBetween, currentStreak, todayISO } from "@/lib/streak";
import { ru, de, enUS } from "date-fns/locale";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const surfaceClass: Record<string, string> = {
  blue: "bg-surface-blue text-surface-blue-foreground",
  mint: "bg-surface-mint text-surface-mint-foreground",
  peach: "bg-surface-peach text-surface-peach-foreground",
  lilac: "bg-surface-lilac text-surface-lilac-foreground",
};

const draftKey = (id: string) => `teamreach.draft.${id}`;

export const ChallengeDetail = () => {
  const { selectedId, setSelectedId, challenges, addProgress, deleteChallenge, isAdmin, toggleDayCheck, joinChallenge } = useApp();
  const { t, lang } = useI18n();
  const [val, setVal] = useState("");
  const [savedDraft, setSavedDraft] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  // Day the user tapped before the PIN gate resolved (streak join flow).
  const pendingDate = useRef<string | null>(null);
  const dateLocale = lang === "ru" ? ru : lang === "de" ? de : enUS;

  // Restore draft when entering a challenge
  useEffect(() => {
    if (!selectedId) return;
    try {
      const saved = localStorage.getItem(draftKey(selectedId));
      setVal(saved ?? "");
      setSavedDraft(false);
    } catch {
      // localStorage may be unavailable (private mode / disabled) — drafts are best-effort
    }
  }, [selectedId]);

  // Debounced autosave of the draft (300ms after the last keystroke)
  useEffect(() => {
    if (!selectedId) return;
    const id = window.setTimeout(() => {
      try {
        if (val.trim()) {
          localStorage.setItem(draftKey(selectedId), val);
          setSavedDraft(true);
        } else {
          localStorage.removeItem(draftKey(selectedId));
          setSavedDraft(false);
        }
      } catch {
        // localStorage may be unavailable (private mode / disabled) — drafts are best-effort
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [val, selectedId]);


  const c = challenges.find((x) => x.id === selectedId);
  if (!c) return null;
  const pct = Math.round((c.current / c.goal) * 100);
  const maxBar = Math.max(...c.history.map((h) => h.value), 1);
  // Streak grid spans the admin-chosen window; legacy rows without a window
  // fall back to the trailing 14 days.
  const streakDays =
    c.startDate && c.endDate ? daysBetween(c.startDate, c.endDate) : lastNDays(14);

  const shareChallenge = async () => {
    const url = `${window.location.origin}/challenge/${c.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("cd.shareCopied"));
      amplitude.track("Challenge Shared", { challenge_id: c.id });
    } catch {
      toast.error(t("cd.shareError"));
    }
  };

  const submit = async () => {
    const n = Number(val);
    if (!n || n <= 0) return toast.error(t("cd.errPositive"));
    if (n > 10000) return toast.error(t("cd.errLarge"));
    try {
      await addProgress(c.id, n);
      setVal("");
      try { localStorage.removeItem(draftKey(c.id)); } catch {
        // localStorage may be unavailable (private mode / disabled) — drafts are best-effort
      }
      setSavedDraft(false);
      toast.success(t("cd.added", { n, unit: c.unit }));
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "PROGRESS_DAILY_CAP") {
        toast.error(t("cd.errDailyCap"));
      } else if (code === "PROGRESS_DAILY_TOTAL") {
        toast.error(t("cd.errDailyTotal"));
      } else {
        toast.error(code || "Failed");
      }
    }
  };

  // Streak: toggle a day's check-off. Joining is required to participate, so
  // a non-joined user is routed through join (and the PIN gate if protected)
  // before the tapped day is recorded.
  const toggleDay = async (date: string) => {
    if (!c.joined) {
      if (c.pinProtected) {
        pendingDate.current = date;
        setPinOpen(true);
        return;
      }
      try {
        await joinChallenge(c.id);
        await toggleDayCheck(c.id, date);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
      return;
    }
    try {
      await toggleDayCheck(c.id, date);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="pb-28">
      <div className={`${surfaceClass[c.surface]} px-5 pt-12 pb-8 rounded-b-[2.5rem]`}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedId(null)}
            className="h-10 w-10 rounded-full bg-background/60 grid place-items-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-xs font-semibold opacity-70 uppercase tracking-wider">{t("cd.label")}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={shareChallenge}
              className="h-10 w-10 rounded-full bg-background/60 grid place-items-center"
              aria-label={t("cd.shareAria")}
            >
              <Share2 className="h-5 w-5" />
            </button>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="h-10 w-10 rounded-full bg-background/60 grid place-items-center text-destructive"
                    aria-label={t("cd.deleteAria")}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("cd.deleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("cd.deleteDesc", { title: c.title })}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await deleteChallenge(c.id);
                          toast.success(t("cd.deleted"));
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        } finally {
                          setDeleting(false);
                        }
                      }}
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {t("cd.deleteConfirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="text-5xl">{c.emoji}</div>
          <h1 className="mt-3 text-2xl font-extrabold">{c.title}</h1>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs opacity-80">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{t("cd.daysLeft", { n: c.daysLeft })}</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{t("cd.members", { n: c.members })}</span>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex justify-between text-sm font-bold mb-2">
            <span>{t("cd.yourProgress")}</span>
            <span>{c.current}/{c.goal} {c.unit}</span>
          </div>
          <div className="h-3 rounded-full bg-background/50 overflow-hidden">
            <div className="h-full bg-foreground/80 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-5">
        {c.type === "streak" ? (
          <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold">{t("streak.markTitle")}</p>
              <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                <Flame className="h-4 w-4" /> {t("streak.count", { n: currentStreak(c.checkedDays) })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t("streak.markDesc")}</p>
            <div className="grid grid-cols-7 gap-2">
              {streakDays.map((d) => {
                const done = c.checkedDays?.includes(d);
                const isToday = d === todayISO();
                // Future days can't be checked off yet.
                const isFuture = d > todayISO();
                return (
                  <button
                    key={d}
                    onClick={() => void toggleDay(d)}
                    disabled={isFuture}
                    aria-pressed={done}
                    aria-label={format(new Date(d), "PPP", { locale: dateLocale })}
                    className={[
                      "aspect-square rounded-2xl grid place-items-center transition active:scale-95 border",
                      done
                        ? "bg-gradient-primary text-primary-foreground border-transparent"
                        : "bg-secondary text-muted-foreground border-border",
                      isToday && !done ? "ring-2 ring-primary/60" : "",
                      isFuture ? "opacity-40 cursor-not-allowed active:scale-100" : "",
                    ].join(" ")}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-semibold">{new Date(d).getDate()}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
              <p className="font-bold mb-3">{t("cd.howMuch")}</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder={t("cd.placeholder", { unit: c.unit })}
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  className="h-12 rounded-2xl border-border bg-secondary text-base"
                />
                <Button onClick={submit} className="h-12 px-6 rounded-2xl">{t("common.add")}</Button>
              </div>
              {savedDraft && (
                <p className="mt-2 text-xs text-muted-foreground">{t("cd.draftSaved")}</p>
              )}
            </div>

            <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold">{t("cd.thisWeek")}</p>
                <Flame className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-end justify-between gap-2 h-32">
                {(c.history.length ? c.history : Array.from({ length: 7 }, (_, i) => ({ day: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i], value: 0 }))).map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-xl bg-gradient-primary transition-all"
                        style={{ height: `${(h.value / maxBar) * 100}%`, minHeight: h.value ? 8 : 4, opacity: h.value ? 1 : 0.15 }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">{h.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <ParticipantsRanking participants={c.participants ?? []} youValue={c.current} unit={c.type === "streak" ? t("streak.daysUnit") : c.unit} />

        <div className="rounded-3xl bg-gradient-card text-primary-foreground p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{t("cd.together")}</p>
          <p className="mt-2 text-4xl font-extrabold">{c.totalAll.toLocaleString()}</p>
          <p className="text-sm opacity-90 mt-1">{t("cd.acrossMembers", { unit: c.type === "streak" ? t("streak.daysUnit") : c.unit, n: c.members })}</p>
        </div>
      </div>

      <PinEntryDialog
        challengeId={c.id}
        open={pinOpen}
        onOpenChange={(v) => { if (!v) { setPinOpen(false); pendingDate.current = null; } }}
        onVerified={async () => {
          const date = pendingDate.current;
          pendingDate.current = null;
          try {
            await joinChallenge(c.id);
            if (date) await toggleDayCheck(c.id, date);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        }}
      />
    </div>
  );
};
