// components/chiller/ChillerFanStatus.tsx
"use client";
import { useI18n } from "@/app/_components/i18n";

interface Props {
  fanOn: boolean;
  isOnline: boolean;
}

export function ChillerFanStatus({ fanOn, isOnline }: Props) {
  const { t } = useI18n();

  return (
    <span className={`fan-badge ${fanOn && isOnline ? "on" : "off"}`}>
      {t("toggle.fan")}: {fanOn && isOnline ? "ON" : "OFF"}
    </span>
  );
}
