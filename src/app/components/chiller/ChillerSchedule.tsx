// components/chiller/ChillerSchedule.tsx
"use client";
import { useI18n } from "@/app/_components/i18n";
import { toLocalizedNumber } from "@/utils/chiller/locale";
import { JDate, toGregorian, jalaaliMonthLength } from "@/utils/chiller/jalaali";
import { useState } from "react";

type TimerMode = "on" | "off" | null;

interface Props {
  timerMode: TimerMode;
  setTimerMode: (m: TimerMode) => void;
  timerJDate: JDate;
  setTimerJDate: (d: JDate) => void;
  timerHour: number;
  setTimerHour: (h: number) => void;
  timerMinute: number;
  setTimerMinute: (m: number) => void;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ChillerSchedule({
  timerMode, setTimerMode,
  timerJDate, setTimerJDate,
  timerHour, setTimerHour,
  timerMinute, setTimerMinute,
  submitting, onSubmit, onCancel,
}: Props) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);

  const summary =
    timerMode === "on"
      ? t("timer.summary.on")
      : timerMode === "off"
        ? t("timer.summary.off")
        : t("timer.summary.none");

  return (
    <div className="chiller-schedule">
      <button onClick={() => setOpen(true)} className="timer-open-btn">
        {t("timer.open")}
      </button>

      {open && (
        <div className="timer-modal-overlay" onClick={() => setOpen(false)}>
          <div className="timer-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t("timer.modal.title")}</h3>
            <p>{t("timer.modal.desc")}</p>

            <div className="timer-mode-select">
              <label>{t("timer.mode.label")}</label>
              <select
                value={timerMode || ""}
                onChange={(e) => setTimerMode((e.target.value as TimerMode) || null)}
              >
                <option value="">--</option>
                <option value="on">{t("timer.mode.on")}</option>
                <option value="off">{t("timer.mode.off")}</option>
              </select>
            </div>

            <div className="timer-date">
              <input
                type="number"
                value={timerJDate.year}
                onChange={(e) => setTimerJDate({ ...timerJDate, year: +e.target.value })}
                placeholder="سال"
              />
              /
              <input
                type="number"
                value={timerJDate.month}
                min={1}
                max={12}
                onChange={(e) => setTimerJDate({ ...timerJDate, month: +e.target.value })}
                placeholder="ماه"
              />
              /
              <input
                type="number"
                value={timerJDate.day}
                min={1}
                max={jalaaliMonthLength(timerJDate.year, timerJDate.month)}
                onChange={(e) => setTimerJDate({ ...timerJDate, day: +e.target.value })}
                placeholder="روز"
              />
            </div>

            <div className="timer-time">
              <input
                type="number"
                value={timerHour}
                min={0}
                max={23}
                onChange={(e) => setTimerHour(+e.target.value)}
              />
              :
              <input
                type="number"
                value={timerMinute}
                min={0}
                max={59}
                onChange={(e) => setTimerMinute(+e.target.value)}
              />
            </div>

            <p className="timer-summary">{summary}</p>

            <div className="timer-actions">
              <button onClick={onSubmit} disabled={submitting || !timerMode}>
                {submitting ? "..." : t("timer.submit")}
              </button>
              <button onClick={onCancel} className="cancel-btn">
                {t("timer.cancel")}
              </button>
              <button onClick={() => setOpen(false)} className="close-btn">
                {t("modal.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
