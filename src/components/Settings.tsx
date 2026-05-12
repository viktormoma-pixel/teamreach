import { useApp } from "@/store/app";
import { useI18n } from "@/i18n";
import { LANGS } from "@/i18n/translations";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronRight, Shield, FileText, Mail, Trash2, ShieldCheck, Languages, Loader2, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
  const { resetAll, isAdmin, auth, signOut } = useApp();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    first_name?: string | null;
    username?: string | null;
    photo_url?: string | null;
    email?: string | null;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const userId = auth.status === "authenticated" ? auth.userId : null;

  useEffect(() => {
    if (!userId) { setProfile(null); return; }
    (async () => {
      // Always fetch the authoritative email from the auth session so we have a
      // fallback if the `profiles` SELECT comes back empty (race, RLS, etc).
      const { data: userData } = await supabase.auth.getUser();
      const authEmail = userData?.user?.email ?? null;

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name,username,photo_url,email")
        .eq("id", userId)
        .maybeSingle();
      if (error) console.error("[TeamReach] profile fetch failed:", error);

      setProfile({
        first_name: data?.first_name ?? null,
        username: data?.username ?? null,
        photo_url: data?.photo_url ?? null,
        email: data?.email ?? authEmail,
      });
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

  // Subline under the username card: shows email or "—".
  const profileSubline = profile?.email ?? "—";

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
        <Row icon={Mail} label={t("set.contactDpo")} hint="viktormoma@gmail.com" onClick={() => { window.location.href = "mailto:viktormoma@gmail.com"; }} />
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
