import { useState } from "react";
import { useApp } from "@/store/app";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, Eye, EyeOff, ShieldCheck, Send, Info } from "lucide-react";
import { toast } from "sonner";

type Mode = "signin" | "signup";

const BOT_USERNAME = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "").trim();
const BOT_URL = BOT_USERNAME ? `https://t.me/${BOT_USERNAME}` : "";

// Inline i18n strings for the "prefer Telegram" notice. Kept here to avoid
// editing the large translations.ts dictionary.
const NOTICE_STRINGS = {
  en: {
    title: "Have Telegram? Use that instead",
    body: "Telegram sign-in syncs your progress and roles automatically. Email creates a separate account that won't be linked to your Telegram one.",
    openBot: "Open in Telegram",
  },
  ru: {
    title: "Есть Telegram? Лучше войти через него",
    body: "Вход через Telegram автоматически синхронизирует прогресс и роли. Email создаёт отдельный аккаунт, не связанный с Telegram-аккаунтом.",
    openBot: "Открыть в Telegram",
  },
  de: {
    title: "Hast du Telegram? Lieber dort anmelden",
    body: "Die Telegram-Anmeldung synchronisiert deinen Fortschritt und deine Rollen automatisch. E-Mail erstellt ein separates Konto, das nicht mit deinem Telegram-Konto verknüpft ist.",
    openBot: "In Telegram öffnen",
  },
} as const;

export const EmailAuthScreen = () => {
  const { signInWithEmail, signUpWithEmail } = useApp();
  const { t, lang } = useI18n();

  const notice = NOTICE_STRINGS[lang as keyof typeof NOTICE_STRINGS] ?? NOTICE_STRINGS.en;

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setShowPassword(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email.trim() || !email.includes("@")) {
      setError(t("email.errEmail"));
      return;
    }
    if (password.length < 8) {
      setError(t("email.errPassShort"));
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError(t("email.errPassMatch"));
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email.trim(), password);
        // onAuthStateChange handles navigation
      } else {
        await signUpWithEmail(email.trim(), password);
        // Session returned → onAuthStateChange navigates automatically
      }
    } catch (err) {
      if (err instanceof Error && err.message === "EMAIL_CONFIRMATION_REQUIRED") {
        setConfirmationSent(true);
      } else {
        const msg = err instanceof Error ? err.message : "Unknown error";
        // Make common Supabase error messages user-friendly
        if (msg.toLowerCase().includes("invalid login credentials")) {
          setError(t("email.errInvalidCredentials"));
        } else if (msg.toLowerCase().includes("user already registered")) {
          setError(t("email.errAlreadyRegistered"));
        } else if (msg.toLowerCase().includes("email not confirmed")) {
          setError(t("email.errNotConfirmed"));
        } else {
          setError(msg);
        }
        toast.error(t("email.authFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Confirmation sent screen ---
  if (confirmationSent) {
    return (
      <div className="app-shell grid place-items-center min-h-screen px-6">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-primary-soft grid place-items-center text-3xl">
            📬
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold">{t("email.confirmTitle")}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("email.confirmDesc", { email })}
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full rounded-2xl h-11"
            onClick={() => { setConfirmationSent(false); switchMode("signin"); }}
          >
            {t("email.backToSignIn")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell grid place-items-center min-h-screen px-6 py-10">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-primary grid place-items-center text-primary-foreground font-black text-2xl shadow-card">
            T
          </div>
          <div>
            <h1 className="text-xl font-extrabold">TeamReach</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("email.subtitle")}</p>
          </div>
        </div>

        {/* "Prefer Telegram" notice */}
        <div className="rounded-2xl bg-primary-soft border border-primary/20 px-4 py-3">
          <div className="flex gap-3 items-start">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug">{notice.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{notice.body}</p>
              {BOT_URL && (
                <Button
                  asChild
                  size="sm"
                  className="w-full rounded-xl h-9 mt-1 font-medium"
                >
                  <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
                    <Send className="mr-2 h-3.5 w-3.5" />
                    {notice.openBot}
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 rounded-2xl bg-secondary gap-1">
          <button
            onClick={() => switchMode("signin")}
            className={`flex-1 h-9 rounded-xl text-sm font-semibold transition-all ${
              mode === "signin"
                ? "bg-card shadow-soft text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("email.tab.signIn")}
          </button>
          <button
            onClick={() => switchMode("signup")}
            className={`flex-1 h-9 rounded-xl text-sm font-semibold transition-all ${
              mode === "signup"
                ? "bg-card shadow-soft text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("email.tab.signUp")}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("email.email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                className="pl-9 rounded-xl h-11"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{t("email.password")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                className="pl-9 pr-10 rounded-xl h-11"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                tabIndex={-1}
                aria-label={showPassword ? t("email.hidePassword") : t("email.showPassword")}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground">{t("email.passHint")}</p>
            )}
          </div>

          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">{t("email.confirmPassword")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  className="pl-9 rounded-xl h-11"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="w-full h-12 rounded-2xl font-semibold"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("email.loading")}</>
            ) : mode === "signin" ? (
              t("email.signIn")
            ) : (
              t("email.signUp")
            )}
          </Button>
        </form>

        {/* Admin hint */}
        <div className="rounded-2xl bg-secondary px-4 py-3 flex gap-3 items-start">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("email.adminHint")}
          </p>
        </div>
      </div>
    </div>
  );
};
