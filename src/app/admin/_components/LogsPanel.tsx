import React from "react";
import { useI18n } from "@/app/_components/i18n";

type PowerSession = {
  id: string;
  unitName: string;
  state: "on" | "off";
  startAt: string;
  endAt?: string;
  durationMs: number;
};

type Props = {
  theme: "dark" | "light";
  sessions: PowerSession[];
  now: number;
};

export function LogsPanel({ theme, sessions, now }: Props) {
  const { locale, t } = useI18n();
  const dateLocale = locale === "fa" ? "fa-IR" : locale === "ar" ? "ar" : "en-US";
  const formatDuration = (ms: number | undefined) => {
    if (!ms || ms <= 0) return "";
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} ${t("time.day")}`);
    if (hours > 0) parts.push(`${hours} ${t("time.hour")}`);
    if (minutes > 0) parts.push(`${minutes} ${t("time.minute")}`);
    if (seconds > 0 && parts.length === 0) parts.push(`${seconds} ${t("time.second")}`);
    if (!parts.length) return t("time.less");
    return parts.join(t("time.and"));
  };

  return (
    <aside
      className={
        theme === "dark"
          ? "rounded-2xl border border-slate-800 bg-slate-950 shadow-lg p-4 flex flex-col gap-3 max-h-[520px]"
          : "rounded-2xl border border-[#e6edf7] bg-[#f4f7fb] shadow-lg p-4 flex flex-col gap-3 max-h-[520px]"
      }
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("logs.title")}</h2>
      </div>
      <div className="flex-1 overflow-auto pr-1">
        {sessions.length === 0 ? (
          <div className={theme === "dark" ? "text-xs text-slate-400" : "text-xs text-[#334155]"}>
            {t("logs.empty")}
          </div>
        ) : (
          <ul className="space-y-3">
            {sessions.map((session) => {
              const durationText = formatDuration(session.durationMs);
              const startDate = new Date(session.startAt);
              const endDate = session.endAt ? new Date(session.endAt) : new Date(now);
              const startDateText = startDate.toLocaleDateString(dateLocale);
              const startTimeText = startDate.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              const endDateText = endDate.toLocaleDateString(dateLocale);
              const endTimeText = endDate.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              const isOn = session.state === "on";
              const barClass =
                theme === "dark"
                  ? isOn
                    ? "shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                    : "shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
                  : isOn
                  ? "shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                  : "shadow-[0_0_0_1px_rgba(248,113,113,0.35)]";
              const headerBg =
                theme === "dark"
                  ? isOn
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-red-500/10 text-red-300"
                  : isOn
                  ? "bg-emerald-50 text-[#334155]"
                  : "bg-red-50 text-[#334155]";

              return (
                <li
                  key={session.id}
                  className={`rounded-2xl border flex flex-col gap-3 transition-colors ${
                    theme === "dark" ? "bg-slate-900/80 border-slate-800" : "bg-[#fbfcff] border-[#e6edf7]"
                  } ${barClass}`}
                >
                  <div className="flex items-center justify-between px-3 pt-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          isOn
                            ? "inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.35)]"
                            : "inline-flex h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.35)]"
                        }
                      />
                      <span className="text-sm font-semibold">{session.unitName}</span>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${headerBg}`}>
                      {isOn ? t("logs.window.on") : t("logs.window.off")}
                    </span>
                  </div>
                  <div className="px-3 pb-3 flex flex-col gap-2">
                    <div className={`flex flex-wrap items-center gap-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-[#334155]"}`}>
                      <span>{t("logs.range.from")}</span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                          theme === "dark" ? "bg-slate-800/60 text-slate-100" : "bg-[#eaf1fb] text-[#334155]"
                        }`}
                      >
                        {startDateText}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                          theme === "dark" ? "bg-slate-800/60 text-slate-100" : "bg-[#eaf1fb] text-[#334155]"
                        }`}
                      >
                        {startTimeText}
                      </span>
                      <span>{t("logs.range.to")}</span>
                      {session.endAt ? (
                        <>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                              theme === "dark" ? "bg-slate-800/60 text-slate-100" : "bg-[#eaf1fb] text-[#334155]"
                            }`}
                          >
                            {endDateText}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                              theme === "dark" ? "bg-slate-800/60 text-slate-100" : "bg-[#eaf1fb] text-[#334155]"
                            }`}
                          >
                            {endTimeText}
                          </span>
                        </>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs ${theme === "dark" ? "bg-slate-800/60 text-slate-100" : "bg-[#eaf1fb] text-[#334155]"}`}
                        >
                          {t("logs.range.now")}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-[#334155]"}`}>
                      {isOn ? t("logs.duration.on") : t("logs.duration.off")}
                      <span className="font-semibold mx-1">{durationText}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
