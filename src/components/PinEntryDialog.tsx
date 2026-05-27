import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Loader2, Lock } from "lucide-react";
import { useApp } from "@/store/app";
import { useI18n } from "@/i18n";

const PIN_LENGTH = 4;

/**
 * Standalone PIN gate. Verifies the entered PIN against the challenge via the
 * server-side verify_challenge_pin RPC and calls onVerified() on success.
 * Used to gate joining PIN-protected challenges.
 */
export const PinEntryDialog = ({
  challengeId,
  open,
  onOpenChange,
  onVerified,
}: {
  challengeId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onVerified: () => void | Promise<void>;
}) => {
  const { verifyPin } = useApp();
  const { t } = useI18n();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  // Reset transient state whenever the dialog opens for a (new) challenge.
  useEffect(() => {
    if (open) {
      setPin("");
      setError(false);
      setChecking(false);
    }
  }, [open, challengeId]);

  const submit = async (value: string) => {
    if (!challengeId || value.length < PIN_LENGTH || checking) return;
    setChecking(true);
    setError(false);
    try {
      const ok = await verifyPin(challengeId, value);
      if (ok) {
        await onVerified();
        onOpenChange(false);
      } else {
        setError(true);
        setPin("");
      }
    } catch {
      setError(true);
      setPin("");
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-3xl">
        <DialogHeader>
          <div className="mx-auto mb-1 h-12 w-12 rounded-full bg-secondary grid place-items-center">
            <Lock className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center">{t("pin.title")}</DialogTitle>
          <DialogDescription className="text-center">{t("pin.desc")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <InputOTP
            maxLength={PIN_LENGTH}
            value={pin}
            onChange={(v) => {
              setPin(v);
              setError(false);
              if (v.length === PIN_LENGTH) void submit(v);
            }}
            disabled={checking}
            autoFocus
          >
            <InputOTPGroup>
              {Array.from({ length: PIN_LENGTH }, (_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {error && <p className="text-sm text-destructive">{t("pin.wrong")}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={checking}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="rounded-full px-6"
            disabled={pin.length < PIN_LENGTH || checking}
            onClick={() => void submit(pin)}
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("pin.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
