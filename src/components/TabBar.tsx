import { useApp } from "@/store/app";
import { useI18n } from "@/i18n";
import { Home, Trophy, Settings as SettingsIcon } from "lucide-react";

export const TabBar = () => {
  const { tab, setTab, setSelectedId } = useApp();
  const { t } = useI18n();
  const tabs = [
    { id: "home" as const, label: t("tab.home"), Icon: Home },
    { id: "leaderboard" as const, label: t("tab.ranking"), Icon: Trophy },
    { id: "settings" as const, label: t("tab.settings"), Icon: SettingsIcon },
  ];
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-card/90 backdrop-blur-xl border border-border rounded-full shadow-card p-1.5 flex gap-1 z-40">
      {tabs.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => { setTab(id); setSelectedId(null); }}
            className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-full text-sm font-semibold transition-all ${
              active ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {active && <span>{label}</span>}
          </button>
        );
      })}
    </nav>
  );
};
