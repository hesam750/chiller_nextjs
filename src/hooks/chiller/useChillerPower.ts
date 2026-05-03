// hooks/chiller/useChillerPower.ts
"use client";
import { useState, useCallback } from "react";
import { toggleChillerPower } from "@/lib/services/chiller-api";
import { useI18n } from "@/app/_components/i18n";

export function useChillerPower(ip: string, canControl: boolean, onToggle: () => void) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const handleToggle = useCallback(
    async (desiredOn: boolean) => {
      if (!canControl) {
        alert(t("no.access.togglePower"));
        return;
      }
      if (busy) return;
      setBusy(true);
      try {
        await toggleChillerPower(ip, desiredOn ? "on" : "off");
        onToggle();
      } catch (err: any) {
        const msg =
          err.message === "forbidden"
            ? t("err.forbidden")
            : t("err.unreachable");
        alert(msg);
      } finally {
        setBusy(false);
      }
    },
    [ip, canControl, busy, t, onToggle]
  );

  return { busy, handleToggle };
}
