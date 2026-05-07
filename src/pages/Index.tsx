import { AppProvider, useApp } from "@/store/app";
import { I18nProvider, useI18n } from "@/i18n";
import { Onboarding } from "@/components/Onboarding";
import { Dashboard } from "@/components/Dashboard";
import { ChallengeDetail } from "@/components/ChallengeDetail";
import { Leaderboard } from "@/components/Leaderboard";
import { Settings } from "@/components/Settings";
import { TabBar } from "@/components/TabBar";
import { AuthErrorScreen } from "@/components/AuthErrorScreen";
import { EmailAuthScreen } from "@/components/EmailAuthScreen";

const Shell = () => {
  const { auth, onboarded, tab, selectedId } = useApp();
  const { t } = useI18n();

  // Loading state
  if (auth.status === "loading") {
    return (
      <div className="app-shell grid place-items-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">{t("auth.loading")}</p>
        </div>
      </div>
    );
  }

  // Unauthenticated: decide which screen to show
  if (auth.status === "unauthenticated") {
    // "no_telegram" means we're in a regular browser → show email auth
    // No error code (initial load, not in Telegram) → show email auth
    const showEmailAuth = !auth.errorCode || auth.errorCode === "no_telegram";
    if (showEmailAuth) {
      return <EmailAuthScreen />;
    }
    // Other Telegram-specific errors (invalid_init_data, stale, network, server…)
    return <AuthErrorScreen errorCode={auth.errorCode} errorDetail={auth.errorDetail} />;
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
