import { useEffect, useState } from "react";
import { AppProvider, useApp } from "@/store/app";
import { I18nProvider, useI18n } from "@/i18n";
import { Onboarding } from "@/components/Onboarding";
import { Dashboard } from "@/components/Dashboard";
import { ChallengeDetail } from "@/components/ChallengeDetail";
import { Leaderboard } from "@/components/Leaderboard";
import { Settings } from "@/components/Settings";
import { TabBar } from "@/components/TabBar";
import { EmailAuthScreen } from "@/components/EmailAuthScreen";
import { UpdatePasswordScreen } from "@/components/UpdatePasswordScreen";

const Shell = () => {
  const { auth, onboarded, tab, selectedId, passwordRecovery, signInWithTelegram } = useApp();
  const { t } = useI18n();
  const [telegramLoading, setTelegramLoading] = useState(false);

  // Clear the Telegram loading flag once auth resolves (success or sign-out).
  // Without this, a successful signInWithTelegram() leaves the loader stuck
  // forever because the only reset path is the .catch below.
  useEffect(() => {
    if (auth.status !== "unauthenticated") setTelegramLoading(false);
  }, [auth.status]);

  // When unauthenticated inside a Telegram Mini App, attempt auto-login.
  // If it fails (e.g. expired initData) we fall back to EmailAuthScreen.
  useEffect(() => {
    if (auth.status !== "unauthenticated") return;
    if (!window.Telegram?.WebApp?.initData) return;

    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    setTelegramLoading(true);

    signInWithTelegram().catch((err) => {
      console.warn("[TeamReach] Telegram auto-login failed:", err?.message ?? err);
      setTelegramLoading(false);
    });
  // signInWithTelegram is stable (useCallback), auth.status is the real trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status]);

  // Loading state (initial session check or Telegram auto-login in progress)
  if (auth.status === "loading" || telegramLoading) {
    return (
      <div className="app-shell grid place-items-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">{t("auth.loading")}</p>
        </div>
      </div>
    );
  }

  // Unauthenticated → show email auth (also serves as fallback if Telegram auto-login failed)
  if (auth.status === "unauthenticated") {
    return <EmailAuthScreen />;
  }

  // Password recovery deep link → force user to set a new password
  if (passwordRecovery) {
    return <UpdatePasswordScreen />;
  }

  // Onboarding
  if (!onboarded) return <Onboarding />;

  // Main app shell
  return (
    <div className="app-shell">
      {selectedId ? (
        <ChallengeDetail />
      ) : (
        <>
          {tab === "home" && <Dashboard />}
          {tab === "leaderboard" && <Leaderboard />}
          {tab === "settings" && <Settings />}
        </>
      )}
      {!selectedId && <TabBar />}
    </div>
  );
};

const Index = () => (
  <I18nProvider>
    <AppProvider>
      <Shell />
    </AppProvider>
  </I18nProvider>
);

export default Index;
