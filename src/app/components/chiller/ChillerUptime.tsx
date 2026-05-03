// components/chiller/ChillerUptime.tsx
"use client";
import { formatForwardUnits } from "@/utils/chiller/locale";
import { useI18n } from "@/app/_components/i18n";

interface Props {
  powerOn: boolean;
  uptimeSeconds: number;
}

export function ChillerUptime({ powerOn, uptimeSeconds }: Props) {
  const { t, locale } = useI18n();
  const prefix = powerOn ? t("uptime.onPrefix") : t("uptime.offPrefix");

  return (
    <div className="chiller-uptime">
      {prefix} {formatForwardUnits(uptimeSeconds, locale)}
    </div>
  );
}
