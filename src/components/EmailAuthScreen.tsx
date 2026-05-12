import { useState } from "react";
import { useApp } from "@/store/app";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Mode = "signin" | "signup" | "forgot";

export const EmailAuthScreen = () => {
  const { signInWithEmail, signUpWithEmail, sendPasswordReset } = useApp();
  const { t } = useI18n();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setShowPassword(false);
    setAcceptTerms(false);
    setAcceptPrivacy(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError(t("email.errEmail"));
      return;
    }

    if (mode === "forgot") {
      setLoading(true);
      try {
        await sendPasswordReset(email.trim());
        setResetSentTo(email.trim());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
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
    if (mode === "signup" && (!acceptTerms || !acceptPrivacy)) {
      setError(t("email.consent.required"));
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
      }
    } catch (err) {
      if (err instanceof Error && err.message === "EMAIL_CONFIRMATION_REQUIRED") {
        setConfirmationSent(true);
      } else {
        const msg = err instanceof Error ? err.message : "Unknown error";
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

  // --- Reset link sent screen ---
  if (resetSentTo) {
    return (
      <div className="app-shell grid place-items-center min-h-screen px-6">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-primary-soft grid place-items-center text-3xl">
            📬
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold">{t("email.reset.sentTitle")}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("email.reset.sentDesc", { email: resetSentTo })}
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full rounded-2xl h-11"
            onClick={() => { setResetSentTo(null); switchMode("signin"); }}
          >
            {t("email.reset.back")}
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
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "forgot" ? t("email.reset.desc") : t("email.subtitle")}
            </p>
          </div>
        </div>

        {/* Tab switcher (hide in forgot mode) */}
        {mode !== "forgot" && (
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
        )}

        {mode === "forgot" && (
          <h2 className="text-base font-semibold text-center">{t("email.reset.title")}</h2>
        )}

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

          {mode !== "forgot" && (
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
              {mode === "signin" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {t("email.forgot")}
                  </button>
                </div>
              )}
            </div>
          )}

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

          {mode === "signup" && (
            <div className="space-y-3 pt-1">
              <label className="flex gap-3 items-start cursor-pointer">
                <Checkbox
                  id="acceptTerms"
                  checked={acceptTerms}
                  onCheckedChange={(v) => { setAcceptTerms(v === true); setError(null); }}
                  className="mt-0.5"
                  disabled={loading}
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t("email.consent.terms")}
                </span>
              </label>
              <label className="flex gap-3 items-start cursor-pointer">
                <Checkbox
                  id="acceptPrivacy"
                  checked={acceptPrivacy}
                  onCheckedChange={(v) => { setAcceptPrivacy(v === true); setError(null); }}
                  className="mt-0.5"
                  disabled={loading}
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t("email.consent.privacy")}
                </span>
              </label>
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
            ) : mode === "signup" ? (
              t("email.signUp")
            ) : (
              t("email.reset.send")
            )}
          </Button>

          {mode === "forgot" && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => switchMode("signin")}
              disabled={loading}
            >
              {t("email.reset.back")}
            </Button>
          )}
        </form>

        {/* Admin hint */}
        {mode !== "forgot" && (
          <div className="rounded-2xl bg-secondary px-4 py-3 flex gap-3 items-start">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("email.adminHint")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
