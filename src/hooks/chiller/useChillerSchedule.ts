// hooks/chiller/useChillerSchedule.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchTimers, submitTimer, cancelTimer } from "@/lib/services/chiller-api";
import { toJalali, toGregorian, JDate } from "@/utils/chiller/jalaali";
import { useI18n } from "@/app/_components/i18n";

type TimerMode = "on" | "off" | null;

export function useChillerSchedule(ip: string) {
  const { t } = useI18n();
  const [timerMode, setTimerMode] = useState<TimerMode>(null);
  const [timerJDate, setTimerJDate] = useState<JDate>(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return toJalali(now);
  });
  const [timerHour, setTimerHour] = useState(0);
  const [timerMinute, setTimerMinute] = useState(0);
  const [timerTarget, setTimerTarget] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load existing timer
  const loadTimer = useCallback(async () => {
    const data = await fetchTimers(ip);
    if (data && data.mode) {
      setTimerMode(data.mode);
      setTimerTarget(data.target);
      if (data.jDate) {
        const [y, m, d] = data.jDate.split("-").map(Number);
        setTimerJDate({ year: y, month: m, day: d });
      }
      setTimerHour(data.hour);
      setTimerMinute(data.minute);
    } else {
      setTimerMode(null);
      setTimerTarget("");
    }
  }, [ip]);

  useEffect(() => {
    loadTimer();
  }, [loadTimer]);

  const submit = useCallback(async () => {
    if (!timerMode) return;
    setSubmitting(true);
    try {
      const gDate = toGregorian(timerJDate);
      gDate.setHours(timerHour, timerMinute, 0, 0);
      await submitTimer(ip, timerMode, gDate.toISOString());
      await loadTimer();
    } catch {
      alert("Failed to submit timer");
    } finally {
      setSubmitting(false);
    }
  }, [ip, timerMode, timerJDate, timerHour, timerMinute, loadTimer]);

  const cancel = useCallback(async () => {
    try {
      await cancelTimer(ip);
      setTimerMode(null);
      setTimerTarget("");
    } catch {
      alert("Failed to cancel timer");
    }
  }, [ip]);

  return {
    timerMode, setTimerMode,
    timerJDate, setTimerJDate,
    timerHour, setTimerHour,
    timerMinute, setTimerMinute,
    timerTarget,
    submitting,
    submit,
    cancel,
  };
}
