import { useState, useEffect } from "react";
import { mixpanel } from "@/lib/mixpanel";
import { useI18n } from "@/i18n";
import * as amplitude from "@amplitude/unified";

const CONSENT_KEY = "teamreach.analytics_consent";

export function CookieConsentBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === null) {
      setVisible(true);
    } else if (stored === "true") {
      mixpanel.opt_in_tracking();
      mixpanel.track_pageview();
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "true");
    mixpanel.opt_in_tracking();
    mixpanel.track("analytics_consent_given");
    mixpanel.track_pageview();
    amplitude.track("Analytics Consent Given");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "false");
    mixpanel.opt_out_tracking();
    amplitude.track("Analytics Consent Declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur-sm sm:p-5">
        <p className="mb-1 text-sm font-semibold text-foreground">{t("cookie.title")}</p>
        <p className="mb-4 text-xs text-muted-foreground">{t("cookie.description")}{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            {t("cookie.learnMore")}
          </a>
        </p>
        <div className="flex gap-2">
          <button
            onClick={accept}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("cookie.accept")}
          </button>
          <button
            onClick={decline}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            {t("cookie.decline")}
          </button>
        </div>
      </div>
    </div>
  );
}
