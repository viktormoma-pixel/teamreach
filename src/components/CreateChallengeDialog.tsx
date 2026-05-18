import { useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/store/app";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { ru, de, enUS } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const UNITS = ["reps", "km", "min", "glasses", "steps", "pages", "kcal", "sessions"];

export const CreateChallengeDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const { createChallenge, isAdmin } = useApp();
  const { t, lang } = useI18n();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [unit, setUnit] = useState("reps");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [subscribersOnly, setSubscribersOnly] = useState(false);

  const dateLocale = lang === "ru" ? ru : lang === "de" ? de : enUS;

  const reset = () => {
    setTitle(""); setEmoji(""); setUnit("reps"); setGoal(""); setDeadline(undefined); setSubscribersOnly(false);
  };

  const schema = z.object({
    title: z.string().trim().min(2, t("cc.errTitle")).max(60),
    emoji: z.string().trim().max(4).optional(),
    unit: z.string().min(1, t("cc.errUnit")),
    goal: z.number().int().positive(t("cc.errGoal")).max(1_000_000),
    deadline: z.date({ required_error: t("cc.errDeadline") }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error(t("cc.adminOnly"));
      return;
    }
    const parsed = schema.safeParse({
      title, emoji, unit, goal: Number(goal), deadline,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const days = Math.max(1, differenceInCalendarDays(startOfDay(parsed.data.deadline), startOfDay(new Date())));
    try {
      await createChallenge({
        title: parsed.data.title,
        emoji: parsed.data.emoji,
        unit: parsed.data.unit,
        goal: parsed.data.goal,
        daysLeft: days,
        subscribersOnly,
      });
      toast.success(t("cc.created"));
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>{t("cc.title")}</DialogTitle>
          <DialogDescription>{t("cc.desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">{t("cc.fTitle")}</Label>
            <Input id="title" placeholder={t("cc.fTitlePh")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
          </div>

          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emoji">{t("cc.fEmoji")}</Label>
              <Input id="emoji" placeholder="🎯" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("cc.fUnit")}</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal">{t("cc.fGoal", { unit })}</Label>
            <Input id="goal" type="number" inputMode="numeric" min={1} placeholder={t("cc.fGoalPh")} value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{t("cc.fDeadline")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP", { locale: dateLocale }) : t("cc.pickDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  disabled={(d) => d < startOfDay(new Date())}
                  initialFocus
                  locale={dateLocale}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">{t("cc.fSubscribersOnly")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("cc.fSubscribersOnlyDesc")}</p>
            </div>
            <Switch
              checked={subscribersOnly}
              onCheckedChange={setSubscribersOnly}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" className="rounded-full px-6">{t("common.create")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
