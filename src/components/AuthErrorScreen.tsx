import { useMemo, useState } from "react";
import { useApp, type AuthErrorCode } from "@/store/app";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertTriangle, Check, Copy, Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

const BOT_USERNAME = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "").trim();
const BOT_URL = BOT_USERNAME ? `https://t.me/${BOT_USERNAME}` : "";

const ICONS: Record<AuthErrorCode, string> = {
  no_telegram: "📱",
  invalid_init_data: "🔒",
  stale_init_data: "⏰",
  network: "📡",
  server: "🛠️",
  session: "🔑",
  unknown: "⚠️",
};

// Short, stable per-tab session id for support handoff (not a real auth session).
function getDiagSessionId(): string {
  const KEY = "teamreach.diagSessionId";
  try {
    let v = sessionStorage.getItem(KEY);
    if (!v) {
      v = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8);
      sessionStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return "n/a";
  }
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const el = document.createElement("textarea");
    el.value = value;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export const AuthErrorScreen = ({
  errorCode,
  errorDetail,
}: {
  errorCode?: AuthErrorCode;
  errorDetail?: string;
}) => {
  const { signInWithTelegram } = useApp();
  const { t } = useI18n();
  const [retrying, setRetrying] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [diagCopied, setDiagCopied] = useState(false);

  const code: AuthErrorCode = errorCode ?? "unknown";
  const titleKey = `auth.err.${code}.title`;
  const descKey = `auth.err.${code}.desc`;
  const hasError = !!errorCode;

  const sessionId = useMemo(() => getDiagSessionId(), []);
  const diagnostics = useMemo(() => {
    const tg =
      // @ts-expect-error injected
      typeof window !== "undefined" ? window.Telegram?.WebApp : null;
    return [
      `Session: ${sessionId}`,
      `Time: ${new Date().toISOString()}`,
      `Error code: ${code}`,
      `Error detail: ${errorDetail ?? "—"}`,
      `Bot: ${BOT_USERNAME || "—"}`,
      `Telegram WebApp: ${tg ? "yes" : "no"}`,
      `Telegram platform: ${tg?.platform ?? "—"}`,
      `Telegram version: ${tg?.version ?? "—"}`,
      `Page URL: ${typeof location !== "undefined" ? location.href : "—"}`,
      `User agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "—"}`,
      `Language: ${typeof navigator !== "undefined" ? navigator.language : "—"}`,
    ].join("\n");
  }, [sessionId, code, errorDetail]);

  const onRetry = async () => {
    setRetrying(true);
    try {
      await signInWithTelegram();
    } finally {
      setRetrying(false);
    }
  };

  const onCopyLink = async () => {
    if (!BOT_URL) return;
    const ok = await copyText(BOT_URL);
    if (ok) {
      setLinkCopied(true);
      toast.success(t("auth.linkCopied"));
      setTimeout(() => setLinkCopied(false), 2000);
    } else {
      toast.error(t("auth.copyFailed"));
    }
  };

  const onCopyDiag = async () => {
    const ok = await copyText(diagnostics);
    if (ok) {
      setDiagCopied(true);
      toast.success(t("auth.diagCopied"));
      setTimeout(() => setDiagCopied(false), 2000);
    } else {
      toast.error(t("auth.copyFailed"));
    }
  };

  return (
    <div className="app-shell grid place-items-center min-h-screen px-6">
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="h-16 w-16 mx-auto rounded-3xl bg-primary-soft grid place-items-center text-3xl">
          {hasError ? ICONS[code] : "👋"}
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-extrabold">
            {hasError ? t(titleKey) : t("auth.title")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {hasError ? t(descKey) : t("auth.desc")}
          </p>
        </div>

        {code === "no_telegram" ? (
          <div className="space-y-2">
            {BOT_URL ? (
              <>
                <Button asChild size="lg" className="w-full rounded-2xl h-12 font-semibold">
                  <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
                    <Send className="mr-2 h-4 w-4" />
                    {t("auth.openBot")}
                  </a>
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onCopyLink}
                  className="w-full rounded-2xl h-11 font-medium"
                >
                  {linkCopied ? (
                    <><Check className="mr-2 h-4 w-4" />{t("auth.linkCopied")}</>
                  ) : (
                    <><Copy className="mr-2 h-4 w-4" />{t("auth.copyLink")}</>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{t("auth.botMissing")}</p>
            )}
          </div>
        ) : (
          <Button
            onClick={onRetry}
            disabled={retrying}
            size="lg"
            className="w-full rounded-2xl h-12 font-semibold"
          >
            {retrying ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("auth.retrying")}</>
            ) : (
              <><RefreshCw className="mr-2 h-4 w-4" />{t("auth.retry")}</>
            )}
          </Button>
        )}

        {hasError && (
          <Accordion type="single" collapsible className="text-left">
            <AccordionItem value="details" className="border-none">
              <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline justify-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("auth.showDetails")}
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span>{t("auth.sessionId")}</span>
                  <code className="font-mono">{sessionId}</code>
                </div>
                <pre className="block text-[11px] bg-secondary rounded-xl p-3 text-muted-foreground whitespace-pre-wrap break-all text-left max-h-48 overflow-auto">
{diagnostics}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCopyDiag}
                  className="w-full rounded-xl"
                >
                  {diagCopied ? (
                    <><Check className="mr-2 h-3.5 w-3.5" />{t("auth.diagCopied")}</>
                  ) : (
                    <><Copy className="mr-2 h-3.5 w-3.5" />{t("auth.copyDiag")}</>
                  )}
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    </div>
  );
};
