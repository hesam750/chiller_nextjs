// components/chiller/ChillerSetpoint.tsx
"use client";
import { useState } from "react";
import { toLocalizedNumber } from "@/utils/chiller/locale";
import { useI18n } from "@/app/_components/i18n";

interface Props {
  setpoint: number;
  savedSetpoint: number;
  applying: boolean;
  highlight: boolean;
  canControl: boolean;
  onApply: (value: number) => void;
}

export function ChillerSetpoint({
  setpoint,
  savedSetpoint,
  applying,
  highlight,
  canControl,
  onApply,
}: Props) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState(String(savedSetpoint));

  return (
    <div className={`chiller-setpoint ${highlight ? "highlight" : ""}`}>
      <label>{t("setpoint.label")}</label>
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={!canControl || applying}
        step={0.5}
      />
      <button
        disabled={!canControl || applying}
        onClick={() => onApply(Number(draft))}
      >
        {applying ? "..." : t("setpoint.apply")}
      </button>
      <span className="current-setpoint">
        {t("setpoint.current")} {toLocalizedNumber(savedSetpoint, locale)}°C
      </span>
    </div>
  );
}
