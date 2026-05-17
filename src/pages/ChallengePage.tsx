import { useParams } from "react-router-dom";
import { AppProvider } from "@/store/app";
import { I18nProvider } from "@/i18n";
import { Shell } from "./Index";

const ChallengePage = () => {
  const { challengeId } = useParams<{ challengeId: string }>();
  return (
    <I18nProvider>
      <AppProvider>
        <Shell deepLinkChallengeId={challengeId} />
      </AppProvider>
    </I18nProvider>
  );
};

export default ChallengePage;
