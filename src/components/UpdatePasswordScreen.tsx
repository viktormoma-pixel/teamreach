import { useState } from "react";
import { useApp } from "@/store/app";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const UpdatePasswordScreen = () => {
  const { updatePassword, signOut } = useApp();
  const { t } = useI18n();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError(t("email.errPassShort")); return; }
    if (password !== confirm) { setError(t("email.errPassMatch")); return; }
    setLoading(true);
    try {
      await updatePassword(password);
      toast.success(t("email.update.success"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell grid place-items-center min-h-screen px-6 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-extrabold">{t("email.update.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("email.update.desc")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="newpw">{t("email.update.newPassword")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="newpw"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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
            <p className="text-xs text-muted-foreground">{t("email.passHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newpw2">{t("email.confirmPassword")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="newpw2"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                className="pl-9 rounded-xl h-11"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          <Button type="submit" size="lg" disabled={loading} className="w-full h-12 rounded-2xl font-semibold">
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("email.loading")}</>
            ) : t("email.update.submit")}
          </Button>

          <Button type="button" variant="ghost" className="w-full" onClick={() => signOut()}>
            {t("email.reset.back")}
          </Button>
        </form>
      </div>
    </div>
  );
};
