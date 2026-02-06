import React from "react";

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
  const formatDuration = (ms: number | undefined) => {
    if (!ms || ms <= 0) return "";
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} روز`);
    if (hours > 0) parts.push(`${hours} ساعت`);
    if (minutes > 0) parts.push(`${minutes} دقیقه`);
    if (seconds > 0 && parts.length === 0) parts.push(`${seconds} ثانیه`);
    if (!parts.length) return "کمتر از یک ثانیه";
    return parts.join(" و ");
  };

  return (
    <aside
      className={
        theme === "dark"
          ? "rounded-2xl border border-slate-800 bg-slate-950 shadow-lg p-4 flex flex-col gap-3 max-h-[520px]"
          : "rounded-2xl border border-slate-200 bg-sky-50/80 shadow-lg p-4 flex flex-col gap-3 max-h-[520px]"
      }
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">لاگ خاموش/روشن</h2>
      </div>
      <div className="flex-1 overflow-auto pr-1">
        {sessions.length === 0 ? (
          <div className={theme === "dark" ? "text-xs text-slate-400" : "text-xs text-black"}>
            هنوز لاگی ثبت نشده است.
          </div>
        ) : (
          <ul className="space-y-3">
            {sessions.map((session) => {
              const durationText = formatDuration(session.durationMs);
              const startDate = new Date(session.startAt);
              const endDate = session.endAt ? new Date(session.endAt) : new Date(now);
              const startDateText = startDate.toLocaleDateString("fa-IR");
              const startTimeText = startDate.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              const endDateText = endDate.toLocaleDateString("fa-IR");
              const endTimeText = endDate.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
                  ? "bg-emerald-50 text-black"
                  : "bg-red-50 text-black";

              return (
                <li
                  key={session.id}
                  className={`rounded-2xl border flex flex-col gap-3 transition-colors ${
                    theme === "dark" ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
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
                      در این بازه {isOn ? "روشن بوده" : "خاموش بوده"}
                    </span>
                  </div>
                  <div className="px-3 pb-3 flex flex-col gap-2">
                    <div className={`flex flex-wrap items-center gap-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-black"}`}>
                      <span>از</span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                          theme === "dark" ? "bg-slate-800/60 text-slate-100" : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {startDateText}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                          theme === "dark" ? "bg-slate-800/60 text-slate-100" : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {startTimeText}
                      </span>
                      <span>تا</span>
                      {session.endAt ? (
                        <>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                              theme === "dark" ? "bg-slate-800/60 text-slate-100" : "bg-slate-200 text-slate-800"
                            }`}
                          >
                            {endDateText}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                              theme === "dark" ? "bg-slate-800/60 text-slate-100" : "bg-slate-200 text-slate-800"
                            }`}
                          >
                            {endTimeText}
                          </span>
                        </>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs ${theme === "dark" ? "bg-slate-800/60 text-slate-100" : "bg-slate-200 text-slate-800"}`}
                        >
                          اکنون
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-black"}`}>
                      مدت {isOn ? "روشن بودن" : "خاموش بودن"}:
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
