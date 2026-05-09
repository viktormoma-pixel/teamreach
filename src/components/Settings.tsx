import { useApp } from "@/store/app";
import { useI18n } from "@/i18n";
import { LANGS } from "@/i18n/translations";
import { isInTelegram } from "@/lib/telegram";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronRight, Shield, FileText, Mail, Trash2, ShieldCheck, Languages, Loader2, LogOut, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const BOT_USERNAME = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "").trim();
const BOT_URL = BOT_USERNAME ? `https://t.me/${BOT_USERNAME}` : "";

// Inline i18n strings for the auth-method indicator. Kept here to avoid
// editing the large translations.ts dictionary.
const AUTH_METHOD_STRINGS = {
  en: {
    method: "Sign-in method",
    telegram: "Telegram",
    email: "Email",
    telegramDesc: "Synced via Telegram WebApp",
    emailDesc: "Standalone email account — not synced with any Telegram account",
  },
  ru: {
    method: "Способ входа",
    telegram: "Telegram",
    email: "Email",
    telegramDesc: "Синхронизация через Telegram WebApp",
    emailDesc: "Отдельный email-аккаунт — не связан с Telegram-аккаунтом",
  },
  de: {
    method: "Anmeldemethode",
    telegram: "Telegram",
    email: "E-Mail",
    telegramDesc: "Synchronisiert über Telegram WebApp",
    emailDesc: "Eigenständiges E-Mail-Konto — nicht mit Telegram verknüpft",
  },
} as const;

// Inline i18n strings for the universal "Login via Telegram" button.
const TG_BUTTON_STRINGS = {
  en: {
    section: "Telegram",
    button: "Login via Telegram",
    descAuthed: "Re-sync your Telegram session",
    descUnauthInTg: "Clears the current session and re-authenticates via Telegram",
    descUnauthInBrowser: "Opens the bot in Telegram to launch the Mini App",
    descNoBot: "Bot username is not configured (VITE_TELEGRAM_BOT_USERNAME)",
    success: "Switched to Telegram login",
    failed: "Failed to switch — try again",
  },
  ru: {
    section: "Telegram",
    button: "Войти через Telegram",
    descAuthed: "Пересинхронизировать сессию Telegram",
    descUnauthInTg: "Очистить текущую сессию и войти через Telegram",
    descUnauthInBrowser: "Открыть бота в Telegram и запустить Mini App",
    descNoBot: "Username бота не настроен (VITE_TELEGRAM_BOT_USERNAME)",
    success: "Вход через Telegram выполнен",
    failed: "Не удалось переключиться — попробуйте ещё раз",
  },
  de: {
    section: "Telegram",
    button: "Mit Telegram anmelden",
    descAuthed: "Telegram-Sitzung erneut synchronisieren",
    descUnauthInTg: "Aktuelle Sitzung löschen und über Telegram anmelden",
    descUnauthInBrowser: "Bot in Telegram öffnen und Mini App starten",
    descNoBot: "Bot-Username nicht konfiguriert (VITE_TELEGRAM_BOT_USERNAME)",
    success: "Per Telegram angemeldet",
    failed: "Wechsel fehlgeschlagen — bitte erneut versuchen",
  },
} as const;

const Row = ({ icon: Icon, label, hint, right, onClick }: any) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition"
  >
    <div className="h-10 w-10 rounded-2xl bg-primary-soft grid place-items-center text-primary">
      <Icon className="h-5 w-5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm">{label}</p>
      {hint && <p className="text-xs text-muted-foreground truncate">{hint}</p>}
    </div>
    {right ?? <ChevronRight className="h-4 w-4 text-muted-foreground" />}
  </button>
);

export const Settings = () => {
  const { resetAll, isAdmin, auth, signInWithTelegram, signOut } = useApp();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    first_name?: string | null;
    username?: string | null;
    telegram_id?: number | null;
    photo_url?: string | null;
    email?: string | null;
  } | null>(null);
  const [switching, setSwitching] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const userId = auth.status === "authenticated" ? auth.userId : null;

  const authStrings = AUTH_METHOD_STRINGS[lang as keyof typeof AUTH_METHOD_STRINGS] ?? AUTH_METHOD_STRINGS.en;
  const tgStrings = TG_BUTTON_STRINGS[lang as keyof typeof TG_BUTTON_STRINGS] ?? TG_BUTTON_STRINGS.en;

  // Method = telegram if profile has telegram_id, otherwise email
  const isTelegramAuth = !!profile?.telegram_id;

  // The universal "Login via Telegram" handler.
  // - Inside Telegram WebView: signs out, then re-runs Telegram auth.
  // - In a regular browser: signs out, then opens the bot in Telegram so
  //   the user can launch the Mini App from there.
  const handleSwitchToTelegram = async () => {
    setSwitching(true);
    try {
      // Always clear any cached session first so the next auth starts clean.
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch { /* non-fatal */ }

      if (isInTelegram()) {
        // We're inside Telegram WebView — re-authenticate immediately.
        await signInWithTelegram();
        toast.success(tgStrings.success);
      } else {
        // Regular browser — send user to the bot.
        if (BOT_URL) {
          window.open(BOT_URL, "_blank", "noopener,noreferrer");
        } else {
          toast.error(tgStrings.descNoBot);
        }
      }
    } catch (e) {
      console.error("[TeamReach] handleSwitchToTelegram failed", e);
      toast.error(e instanceof Error ? e.message : tgStrings.failed);
    } finally {
      setSwitching(false);
    }
  };

  useEffect(() => {
    if (!userId) { setProfile(null); return; }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name,username,telegram_id,photo_url,email")
        .eq("id", userId)
        .maybeSingle();
      setProfile(data ?? null);
    })();
  }, [userId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await signOut();
      await resetAll();
      toast.success(t("set.deleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeleting(false);
    }
  };

  // Subline under the username card: shows telegram_id, email, or "—".
  const profileSubline = isTelegramAuth
    ? `Telegram ID · ${profile?.telegram_id}`
    : profile?.email
      ? profile.email
      : "—";

  // Description for the Telegram button — depends on current state.
  const tgButtonDesc = isTelegramAuth
    ? tgStrings.descAuthed
    : !BOT_URL && !isInTelegram()
      ? tgStrings.descNoBot
      : isInTelegram()
        ? tgStrings.descUnauthInTg
        : tgStrings.descUnauthInBrowser;

  return (
    <div className="px-5 pt-12 pb-32">
      <header>
        <h1 className="text-2xl font-extrabold">{t("set.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("set.subtitle")}</p>
      </header>

      <div className="mt-6 rounded-3xl bg-gradient-card text-primary-foreground p-5 shadow-card flex items-center gap-4">
        {profile?.photo_url ? (
          <img src={profile.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-background/20 grid place-items-center text-xl font-extrabold">
            {(profile?.first_name || profile?.username || profile?.email || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{profile?.first_name || profile?.username || profile?.email || "User"}</p>
          <p className="text-sm opacity-80 truncate">{profileSubline}</p>
        </div>
      </div>

      {/* Sign-in method indicator */}
      <h2 className="mt-8 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
        {authStrings.method}
      </h2>
      <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-soft">
        <div className="flex items-center gap-4 p-4">
          <div className={`h-10 w-10 rounded-2xl grid place-items-center ${isTelegramAuth ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"}`}>
            {isTelegramAuth ? <Send className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {isTelegramAuth ? authStrings.telegram : authStrings.email}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isTelegramAuth ? authStrings.telegramDesc : authStrings.emailDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Universal "Login via Telegram" — always visible */}
      <h2 className="mt-8 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
        {tgStrings.section}
      </h2>
      <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-soft">
        <button
          onClick={handleSwitchToTelegram}
          disabled={switching}
          className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition disabled:opacity-50"
        >
          <div className="h-10 w-10 rounded-2xl bg-primary-soft text-primary grid place-items-center">
            <Send className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{tgStrings.button}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{tgButtonDesc}</p>
          </div>
          {switching ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      <h2 className="mt-8 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">{t("set.preferences")}</h2>
      <div className="rounded-3xl bg-card border border-border divide-y divide-border overflow-hidden shadow-soft">
        {isAdmin && (
          <Row icon={ShieldCheck} label={t("set.adminMode")} hint={t("set.adminModeHint")} right={<Switch checked={isAdmin} disabled />} />
        )}
        <Row
          icon={Languages}
          label={t("set.language")}
          hint={t("set.languageHint")}
          right={
            <Select value={lang} onValueChange={(v) => setLang(v as any)}>
              <SelectTrigger className="h-9 w-[130px] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGS.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    <span className="mr-2">{l.flag}</span>{l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </div>

      <h2 className="mt-8 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">{t("set.signOut")}</h2>
      <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-soft">
        <Row icon={LogOut} label={t("set.signOut")} hint={t("set.signOutHint")} onClick={() => signOut()} />
      </div>

      <h2 className="mt-8 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">{t("set.legal")}</h2>
      <div className="rounded-3xl bg-card border border-border divide-y divide-border overflow-hidden shadow-soft">
        <Row icon={Shield} label={t("set.privacy")} hint={t("set.privacyHint")} onClick={() => navigate("/privacy")} />
        <Row icon={FileText} label={t("set.impressum")} hint={t("set.impressumHint")} onClick={() => navigate("/impressum")} />
        <Row icon={Mail} label={t("set.contactDpo")} hint="datenschutz@teamreach.app" onClick={() => { window.location.href = "mailto:datenschutz@teamreach.app"; }} />
      </div>

      <h2 className="mt-8 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">{t("set.yourData")}</h2>
      <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-soft">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full flex items-center gap-4 p-4 text-left hover:bg-destructive/5 transition">
              <div className="h-10 w-10 rounded-2xl bg-destructive/10 grid place-items-center text-destructive">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-destructive">{t("set.delete")}</p>
                <p className="text-xs text-muted-foreground">{t("set.deleteHint")}</p>
              </div>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("set.deleteConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("set.deleteConfirmDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("set.deleteConfirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">{t("set.footer")}</p>
    </div>
  );
};
