// components/chiller/ChillerPowerToggle.tsx
"use client";
import { useI18n } from "@/app/_components/i18n";

interface Props {
  powerOn: boolean;
  busy: boolean;
  onToggle: (desiredOn: boolean) => void;
}

export function ChillerPowerToggle({ powerOn, busy, onToggle }: Props) {
  const { t } = useI18n();

  return (
    <button
      className={`chiller-power-btn ${powerOn ? "on" : "off"}`}
      disabled={busy}
      onClick={() => onToggle(!powerOn)}
      aria-label={powerOn ? t("toggle.off") : t("toggle.on")}
    >
      {busy ? "..." : powerOn ? t("toggle.on") : t("toggle.off")}
    </button>
  );
}
