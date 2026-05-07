import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "@/store/app";
import { useI18n, type Lang } from "@/i18n";
import { LANGS } from "@/i18n/translations";
import { Users, TrendingUp, ShieldCheck, ArrowRight } from "lucide-react";

export const Onboarding = () => {
  const { setOnboarded } = useApp();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);

  const slides = [
    { icon: Users, titleKey: "onb.slide1.title", textKey: "onb.slide1.text", accent: "bg-surface-blue text-surface-blue-foreground" },
    { icon: TrendingUp, titleKey: "onb.slide2.title", textKey: "onb.slide2.text", accent: "bg-surface-mint text-surface-mint-foreground" },
    { icon: ShieldCheck, titleKey: "onb.slide3.title", textKey: "onb.slide3.text", accent: "bg-surface-lilac text-surface-lilac-foreground" },
  ];

  const isLast = step === slides.length - 1;
  const Slide = slides[step];
  const Icon = Slide.icon;

  return (
    <div className="app-shell flex flex-col px-6 pt-12 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-gradient-primary grid place-items-center text-primary-foreground font-black">
            T
          </div>
          <span className="font-bold text-lg">TeamReach</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code as Lang)}
                className={`h-7 px-2.5 rounded-full text-xs font-semibold transition ${
                  lang === l.code ? "bg-card shadow-soft" : "text-muted-foreground"
                }`}
                aria-label={l.label}
              >
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>
          {!isLast && (
            <button onClick={() => setStep(slides.length - 1)} className="text-sm text-muted-foreground">
              {t("common.skip")}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center mt-10">
        <div className={`h-40 w-40 rounded-3xl ${Slide.accent} grid place-items-center shadow-soft`}>
          <Icon className="h-16 w-16" strokeWidth={1.6} />
        </div>
        <h1 className="mt-10 text-3xl font-extrabold leading-tight">{t(Slide.titleKey)}</h1>
        <p className="mt-4 text-muted-foreground text-base max-w-xs">{t(Slide.textKey)}</p>
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-2 bg-muted"}`}
          />
        ))}
      </div>

      {isLast && (
        <label className="flex items-start gap-3 mb-4 px-1 text-sm text-muted-foreground">
          <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
          <span>
            {t("onb.consent")}{" "}
            <button type="button" onClick={() => navigate("/privacy")} className="text-primary font-semibold underline">{t("onb.privacy")}</button>.
          </span>
        </label>
      )}

      <Button
        size="lg"
        className="h-14 rounded-2xl text-base font-semibold bg-primary hover:bg-primary/90"
        disabled={isLast && !consent}
        onClick={() => (isLast ? setOnboarded(true) : setStep(step + 1))}
      >
        {isLast ? t("common.getStarted") : t("common.next")}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
};
