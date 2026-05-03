// hooks/chiller/useChillerSetpoint.ts
"use client";
import { useState, useCallback } from "react";
import { setChillerSetpoint } from "@/lib/services/chiller-api";
import { useI18n } from "@/app/_components/i18n";

export function useChillerSetpoint(ip: string, canControl: boolean) {
  const { t } = useI18n();
  const [setpoint, setSetpoint] = useState(0);
  const [savedSetpoint, setSavedSetpoint] = useState(0);
  const [applying, setApplying] = useState(false);
  const [highlight, setHighlight] = useState(false);

  const applySetpoint = useCallback(
    async (value: number) => {
      if (!canControl) {
        alert(t("no.access.setTemperature"));
        return;
      }
      setApplying(true);
      setSetpoint(value);
      try {
        await setChillerSetpoint(ip, value);
        setSavedSetpoint(value);
        setHighlight(true);
        setTimeout(() => setHighlight(false), 2000);
      } catch (err: any) {
        alert(t("err.setpoint.send"));
      } finally {
        setApplying(false);
      }
    },
    [ip, canControl, t]
  );

  return { setpoint, setSetpoint, savedSetpoint, setSavedSetpoint, applying, highlight, applySetpoint };
}
