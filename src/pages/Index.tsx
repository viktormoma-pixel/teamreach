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
  const { auth, onboarded, tab, selectedId, passwordRecovery } = useApp();
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

  // Unauthenticated → always show email auth
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
