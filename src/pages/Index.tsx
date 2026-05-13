import { useEffect, useRef, useState } from "react";
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
  // Prevents re-auto-login after the user explicitly signs out within the same session.
  const didAutoLoginRef = useRef(false);

  // Clear the Telegram loading flag once auth resolves (success or sign-out).
  useEffect(() => {
    if (auth.status !== "unauthenticated") setTelegramLoading(false);
  }, [auth.status]);

  // When unauthenticated inside a Telegram Mini App, attempt auto-login once.
  // If the user signed out manually (didAutoLoginRef already set) we skip it
  // so they land on the email/registration screen instead of being re-logged in.
  useEffect(() => {
    if (auth.status !== "unauthenticated") return;
    if (!window.Telegram?.WebApp?.initData) return;
    if (didAutoLoginRef.current) return; // user signed out — don't re-login

    didAutoLoginRef.current = true;
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
