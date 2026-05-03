// components/chiller/ChillerStartingOverlay.tsx
"use client";
import { useI18n } from "@/app/_components/i18n";
import { toLocalizedNumber } from "@/utils/chiller/locale";

interface Props {
  starting: boolean;
  startingMode: "on" | "off" | null;
  startingSeconds: number;
}

export function ChillerStartingOverlay({ starting, startingMode, startingSeconds }: Props) {
  const { t, locale } = useI18n();
  if (!starting || !startingMode) return null;

  const label = startingMode === "on" ? t("starting.on") : t("starting.off");

  return (
    <div className="starting-overlay">
      <div className="starting-content">
        <span>{label}</span>
        <span className="countdown">{toLocalizedNumber(startingSeconds, locale)}s</span>
      </div>
    </div>
  );
}
