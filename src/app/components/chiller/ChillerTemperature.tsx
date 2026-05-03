// components/chiller/ChillerTemperature.tsx
"use client";
import { toLocalizedNumber } from "@/utils/chiller/locale";
import { useI18n } from "@/app/_components/i18n";

interface Props {
  tempCurrent: number;
  isOnline: boolean;
}

export function ChillerTemperature({ tempCurrent, isOnline }: Props) {
  const { t, locale } = useI18n();

  if (!isOnline) {
    return <span className="temp-disconnected">{t("disconnected")}</span>;
  }

  return (
    <div className="chiller-temp">
      <span className="temp-label">{t("temp.current")}</span>
      <span className="temp-value">
        {toLocalizedNumber(tempCurrent, locale)}°C
      </span>
    </div>
  );
}
