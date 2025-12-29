"use client";

import { useState, useEffect, useCallback } from "react";
import jalaali from "jalaali-js";

type Props = {
  name: string;
  ip: string;
  active: boolean;
  mode?: "dark" | "light";
  canControl?: boolean;
  onTogglePower: (payload: { name: string; ip: string; next: boolean }) => Promise<{ ok: boolean }>;
  onApplySetpoint?: (payload: {
    name: string;
    ip: string;
    value: number;
  }) => Promise<{ ok: boolean; actual?: number | null }>;
};

const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toPersianNumber(value: number | string) {
  const s = String(value);
  let out = "";
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    const code = ch.charCodeAt(0);
    if (code >= 48 && code <= 57) {
      out += persianDigits[code - 48];
    } else {
      out += ch;
    }
  }
  return out;
}

type JalaliDate = {
  jy: number;
  jm: number;
  jd: number;
};

function toJalali(gy: number, gm: number, gd: number): JalaliDate {
  return jalaali.toJalaali(gy, gm, gd);
}

function toGregorian(jy: number, jm: number, jd: number) {
  return jalaali.toGregorian(jy, jm, jd);
}

function jalaaliMonthLength(jy: number, jm: number) {
  return jalaali.jalaaliMonthLength(jy, jm);
}

const jalaliWeekdaysShort = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const jalaliMonthNames = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export function ChillerCard({
  name,
  ip,
  active,
  mode = "dark",
  canControl = true,
  onTogglePower,
  onApplySetpoint,
}: Props) {
  const [powerOn, setPowerOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startingMode, setStartingMode] = useState<"on" | "off" | null>(null);
  const [startingSeconds, setStartingSeconds] = useState(0);
  const [setpoint, setSetpoint] = useState(25);
  const [savedSetpoint, setSavedSetpoint] = useState<number | null>(null);
  const [tempCurrent, setTempCurrent] = useState<number | null>(null);
  const [lastCmdAt, setLastCmdAt] = useState(0);
  const [lastUserAdjustAt, setLastUserAdjustAt] = useState(0);
  const [timerMode, setTimerMode] = useState<"on" | "off" | null>(null);
  const [timerJDate, setTimerJDate] = useState<JalaliDate>(() => {
    const now = new Date();
    const plus = new Date(now.getTime() + 60 * 60 * 1000);
    return toJalali(plus.getFullYear(), plus.getMonth() + 1, plus.getDate());
  });
  const [timerHour, setTimerHour] = useState(() => {
    const now = new Date();
    const plus = new Date(now.getTime() + 60 * 60 * 1000);
    return plus.getHours();
  });
  const [timerMinute, setTimerMinute] = useState(() => {
    const now = new Date();
    const plus = new Date(now.getTime() + 60 * 60 * 1000);
    return plus.getMinutes();
  });
  const [calendarYear, setCalendarYear] = useState(() => {
    const now = new Date();
    const plus = new Date(now.getTime() + 60 * 60 * 1000);
    const j = toJalali(plus.getFullYear(), plus.getMonth() + 1, plus.getDate());
    return j.jy;
  });
  const [calendarMonthIndex, setCalendarMonthIndex] = useState(() => {
    const now = new Date();
    const plus = new Date(now.getTime() + 60 * 60 * 1000);
    const j = toJalali(plus.getFullYear(), plus.getMonth() + 1, plus.getDate());
    return j.jm;
  });
  const [timerTarget, setTimerTarget] = useState<number | null>(null);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const [timerOpen, setTimerOpen] = useState(false);
  const [applyHighlight, setApplyHighlight] = useState(false);

  const handleToggle = useCallback(
    async (target?: boolean) => {
      if (!active || busy || !canControl) return;
      if (timerTarget) {
        setTimerTarget(null);
        setTimerMode(null);
      }
      const next = typeof target === "boolean" ? target : !powerOn;
      setBusy(true);
      try {
        const res = await onTogglePower({ name, ip, next });
        if (res && res.ok) {
          setPowerOn(next);
          if (next) {
            setStarting(true);
            setStartingMode("on");
            setStartingSeconds(0);
          } else {
            setStarting(true);
            setStartingMode("off");
            setStartingSeconds(0);
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [active, busy, canControl, timerTarget, powerOn, onTogglePower, name, ip],
  );

  const isDark = mode === "dark";

  const remainingMs = timerTarget ? Math.max(0, timerTarget - timerNow) : 0;
  const remainingTotalSeconds = Math.floor(remainingMs / 1000);
  const remainingH = Math.floor(remainingTotalSeconds / 3600);
  const remainingM = Math.floor((remainingTotalSeconds % 3600) / 60);
  const remainingS = remainingTotalSeconds % 60;
  const remainingHms = [remainingH, remainingM, remainingS]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");

  const spMin = 10;
  const spMax = 30;
  const spStep = 0.1;

  const decSetpoint = () => {
    const now = Date.now();
    setLastCmdAt(now);
    setLastUserAdjustAt(now);
    setSetpoint((prev) => {
      const v = Math.max(spMin, prev - spStep);
      return Math.round(v * 10) / 10;
    });
  };

  const incSetpoint = () => {
    const now = Date.now();
    setLastCmdAt(now);
    setLastUserAdjustAt(now);
    setSetpoint((prev) => {
      const v = Math.min(spMax, prev + spStep);
      return Math.round(v * 10) / 10;
    });
  };

  const applySetpoint = async () => {
    if (!canControl || !onApplySetpoint || busy) return;
    const clamped = Math.round(Math.min(spMax, Math.max(spMin, setpoint)) * 10) / 10;
    const now = Date.now();
    setLastCmdAt(now);
    setLastUserAdjustAt(0);
    setApplyHighlight(false);
    setSetpoint(clamped);
    setBusy(true);
    try {
      const res = await onApplySetpoint({ name, ip, value: clamped });
      if (res && res.ok) {
        const actual =
          typeof res.actual === "number" && !Number.isNaN(res.actual) ? res.actual : clamped;
        setSavedSetpoint(actual);
        setSetpoint(actual);
      }
    } finally {
      setBusy(false);
    }
  };

  const startTimer = () => {
    console.log("startTimer called", {
      canControl,
      busy,
      active,
      timerMode,
      timerJDate,
      timerHour,
      timerMinute,
    });
    if (!canControl || busy || !active) {
      console.log("startTimer aborted: permissions/busy/active");
      return;
    }
    if (!timerMode) {
      console.log("startTimer aborted: no timerMode");
      return;
    }
    if (!timerJDate) {
      console.log("startTimer aborted: no timerJDate");
      return;
    }
    const { gy, gm, gd } = toGregorian(
      timerJDate.jy,
      timerJDate.jm,
      timerJDate.jd,
    );
    const targetDate = new Date(gy, gm - 1, gd, timerHour, timerMinute, 0, 0);
    const target = targetDate.getTime();
    console.log("startTimer targetDate", {
      gy,
      gm,
      gd,
      targetDate: targetDate.toISOString(),
      target,
    });
    if (!Number.isFinite(target)) {
      console.log("startTimer aborted: invalid target time");
      return;
    }
    const now = Date.now();
    const diffMs = target - now;
    console.log("startTimer diffMs", diffMs);
    if (!Number.isFinite(diffMs) || diffMs <= 0) {
      console.log("startTimer aborted: diffMs invalid or <= 0");
      return;
    }
    const hours = diffMs / (60 * 60 * 1000);
    setTimerTarget(target);
    setTimerNow(now);
    try {
      const payload = {
        chillerName: name,
        chillerIp: ip,
        mode: timerMode,
        hours,
        targetAt: targetDate.toISOString(),
      };
      fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          console.log("Timer POST response status:", res.status);
          return res.ok ? res.json() : null;
        })
        .then((data) => {
          console.log("Timer POST response data:", data);
          if (data && data.item) {
            setTimerTarget(target);
            setTimerNow(now);
            setTimerMode(data.item.mode);
            const targetDate2 = new Date(data.item.targetAt);
            const jDate = toJalali(
              targetDate2.getFullYear(),
              targetDate2.getMonth() + 1,
              targetDate2.getDate(),
            );
            setTimerJDate(jDate);
            setCalendarYear(jDate.jy);
            setCalendarMonthIndex(jDate.jm);
            setTimerHour(targetDate2.getHours());
            setTimerMinute(targetDate2.getMinutes());
          }
        })
        .catch((error) => {
          console.error("Timer POST error:", error);
        });
    } catch (e) {
      console.error("startTimer error", e);
    }
  };

  const cancelTimer = () => {
    setTimerTarget(null);
    setTimerMode(null);
    if (!ip) return;
    try {
      fetch("/api/timers?chillerIp=" + encodeURIComponent(ip), {
        method: "DELETE",
      }).catch(() => undefined);
    } catch {
    }
  };

  useEffect(() => {
    if (!setpoint || savedSetpoint == null) return;
    if (Math.abs(setpoint - savedSetpoint) < 0.001) {
      setApplyHighlight(false);
      return;
    }
    if (!lastUserAdjustAt) return;
    setApplyHighlight(true);
    let cancelled = false;
    const id = setTimeout(() => {
      if (cancelled) return;
      setApplyHighlight(false);
    }, 10000);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [setpoint, savedSetpoint, lastUserAdjustAt]);

  useEffect(() => {
    if (!starting) return;
    let cancelled = false;
    const startedAt = Date.now();
    setStartingSeconds(0);
    const maxSeconds = startingMode === "off" ? 30 : 60;
    const id = setInterval(() => {
      if (cancelled) return;
      const elapsed = Math.min(maxSeconds, Math.floor((Date.now() - startedAt) / 1000));
      setStartingSeconds(elapsed);
      if (elapsed >= maxSeconds) {
        setStarting(false);
        setStartingMode(null);
      }
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [starting, startingMode]);

  useEffect(() => {
    if (starting) return;
    if (!powerOn) {
      setStarting(false);
      setStartingSeconds(0);
      setStartingMode(null);
    }
  }, [powerOn, starting]);

  useEffect(() => {
    if (!ip || !active) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          "/api/timers?chillerIp=" + encodeURIComponent(ip),
        );
        if (!res.ok) return;
        const j = (await res.json().catch(() => null)) as
          | {
              item: {
                mode?: string;
                hours?: number;
                targetAt?: string;
                active?: boolean;
              } | null;
            }
          | null;
        if (!j || !j.item || cancelled) return;
        if (j.item.active === false) return;
        if (
          typeof j.item.mode !== "string" ||
          (j.item.mode !== "on" && j.item.mode !== "off")
        ) {
          return;
        }
        if (typeof j.item.targetAt !== "string") {
          return;
        }
        const targetDate = new Date(j.item.targetAt);
        const target = targetDate.getTime();
        if (!Number.isFinite(target)) {
          return;
        }
        const now = Date.now();
        if (target <= now) {
          return;
        }
        setTimerMode(j.item.mode);
        setTimerTarget(target);
        setTimerNow(now);
        const jDate = toJalali(
          targetDate.getFullYear(),
          targetDate.getMonth() + 1,
          targetDate.getDate(),
        );
        setTimerJDate(jDate);
        setCalendarYear(jDate.jy);
        setCalendarMonthIndex(jDate.jm);
        setTimerHour(targetDate.getHours());
        setTimerMinute(targetDate.getMinutes());
      } catch {
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [ip, timerTarget, active]);

  useEffect(() => {
    if (!ip || !active || starting) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const intervalMs = 8000;
    const tick = async () => {
      if (cancelled) return;
      try {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
          timer = setTimeout(tick, intervalMs);
          return;
        }
        const res = await fetch("/api/chiller-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip, kind: "status" }),
        });
        if (res.ok) {
          const j = (await res.json().catch(() => null)) as
            | {
                ok?: boolean;
                power?: boolean;
                tempCurrent?: number | null;
                setpoint?: number | null;
              }
            | null;
          if (!cancelled && j && (j.ok === undefined || j.ok)) {
            if (typeof j.power === "boolean") {
              setPowerOn(j.power);
            }
            if (typeof j.tempCurrent === "number" && !Number.isNaN(j.tempCurrent)) {
              setTempCurrent(j.tempCurrent);
            }
            if (typeof j.setpoint === "number" && !Number.isNaN(j.setpoint)) {
              const nowTs = Date.now();
              if (
                (!lastCmdAt || nowTs - lastCmdAt > 1500) &&
                (!lastUserAdjustAt || nowTs - lastUserAdjustAt > 10000)
              ) {
                const adj = Math.round(j.setpoint * 10) / 10;
                setSavedSetpoint(adj);
                setSetpoint(adj);
              }
            }
          }
        }
      } catch {
      }
      if (!cancelled) {
        timer = setTimeout(tick, intervalMs);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [ip, active, lastCmdAt, lastUserAdjustAt, starting]);

  useEffect(() => {
    if (!timerTarget) return;
    let cancelled = false;
    const id = setInterval(() => {
      if (cancelled) return;
      setTimerNow(Date.now());
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [timerTarget]);

  useEffect(() => {
    if (!timerTarget || !timerMode || starting) return;
    const remaining = timerTarget - timerNow;
    if (remaining > 0) return;
    const desired = timerMode === "on";
    setTimerTarget(null);
    setTimerMode(null);
    handleToggle(desired);
  }, [timerTarget, timerMode, timerNow, starting, handleToggle]);

  const canSubmitTimer =
    !!timerMode && !!timerJDate && !busy && canControl && active;

  return (
    <div
      className={`flex flex-col rounded-[20px] overflow-hidden ${
        isDark
          ? "border border-[#1b2335] bg-[#07101f] text-slate-50 shadow-[0_18px_50px_rgba(0,0,0,0.7)]"
          : "border border-zinc-200 bg-white text-zinc-900 shadow-[0_14px_40px_rgba(15,23,42,0.12)]"
      } ${!active ? "opacity-50" : ""}`}
    >
      <div className="px-5 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div
              className={`text-[11px] ${
                isDark ? "text-slate-400" : "text-zinc-500"
              }`}
            >
              واحد
            </div>
            <div className="text-sm font-semibold">{name}</div>
          </div>
          <span
            className={`text-[11px] ltr ${
              isDark ? "text-slate-500" : "text-zinc-500"
            }`}
          >
            {ip || "IP تنظیم نشده"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center pt-4 pb-3 px-5">
        <div
          className={`relative w-[150px] h-[150px] rounded-full flex items-center justify-center shadow-[0_18px_40px_rgba(0,0,0,0.75)] border-2 transition-colors duration-300 ${
            powerOn ? "border-emerald-500/80" : "border-red-500/80"
          } bg-[radial-gradient(circle_at_30%_20%,#ffffff1a,transparent_60%),radial-gradient(circle_at_70%_80%,#ffffff0d,transparent_55%),linear-gradient(145deg,#161f2b,#070d18)]`}
        >
          <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="w-[130px] h-[130px]">
            <defs>
              <linearGradient id="bladeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#cfd5db" />
                <stop offset="40%" stopColor="#9aa2aa" />
                <stop offset="60%" stopColor="#858c94" />
                <stop offset="100%" stopColor="#d6dbe0" />
              </linearGradient>
              <radialGradient id="hubMetal" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#e7eaee" />
                <stop offset="65%" stopColor="#c2c7ce" />
                <stop offset="100%" stopColor="#9ba2aa" />
              </radialGradient>
              <linearGradient id="shroudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#757c84" />
                <stop offset="100%" stopColor="#444a50" />
              </linearGradient>
              <clipPath id="fanClip">
                <circle cx="60" cy="60" r="52" />
              </clipPath>
            </defs>
            <circle cx="60" cy="60" r="56" fill="url(#shroudGrad)" stroke="#2f3337" strokeWidth="4" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2327" strokeWidth="1" opacity="0.6" />
            <g
              className="origin-center"
              style={{
                animation: powerOn ? "spin 0.7s linear infinite" : "spin 18s linear infinite",
                opacity: powerOn ? 1 : 0.9,
                filter: powerOn ? "blur(0.4px)" : "none",
              }}
              clipPath="url(#fanClip)"
            >
              <g transform="translate(60,60)">
                <g transform="scale(0.80)">
                  <g id="blade6" fill="url(#bladeMetal)">
                    <path d="M 2 -18 C 8 -30, 22 -40, 34 -42 C 45 -44, 50 -42, 52 -38 C 54 -33, 49 -27, 42 -24 C 33 -20, 22 -15, 14 -9 C 6 -3, 0 4, -2 10 C -4 15, -6 18, -10 18 C -14 18, -16 14, -16 10 C -16 2, -10 -8, 2 -18 Z" />
                  </g>
                  <use href="#blade6" transform="rotate(0)" />
                  <use href="#blade6" transform="rotate(60)" />
                  <use href="#blade6" transform="rotate(120)" />
                  <use href="#blade6" transform="rotate(180)" />
                  <use href="#blade6" transform="rotate(240)" />
                  <use href="#blade6" transform="rotate(300)" />
                </g>
              </g>
            </g>
            <circle cx="60" cy="60" r="12" fill="url(#hubMetal)" stroke="#3b4147" strokeWidth="0.9" />
            <circle cx="60" cy="60" r="4" fill="#343a40" />
          </svg>
          <div
            className={`pointer-events-none absolute inset-4 rounded-full border-2 transition-colors duration-300 ${
              powerOn
                ? "border-emerald-400/80 shadow-[0_0_25px_rgba(16,185,129,0.7)]"
                : "border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.7)]"
            }`}
          />
        </div>
      </div>

      <div className="px-5 pb-3">
        <div
          className={`rounded-2xl px-4 py-3 flex items-center justify-between gap-3 border ${
            isDark
              ? "border-[#2a3347] bg-[#050c18]"
              : "border-zinc-200 bg-zinc-50"
          }`}
        >
          <div className="flex flex-col gap-0.5 text-sm">
            <span className={isDark ? "text-slate-300" : "text-zinc-700"}>
              تنظیم تایمر
            </span>
            <span
              className={`text-[10px] sm:text-xs ${
                isDark ? "text-slate-400" : "text-zinc-500"
              } ${timerTarget && timerMode ? "font-mono ltr" : "font-medium"}`}
            >
              {timerTarget && timerMode
                ? `${timerMode === "on" ? "روشن در" : "خاموش در"} ${remainingHms}`
                : "بدون تایمر فعال"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTimerOpen(true)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
              isDark
                ? "bg-[#111827] text-slate-100 hover:bg-[#1f2937]"
                : "bg-zinc-900 text-zinc-50 hover:bg-black"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            تنظیم
          </button>
        </div>
      </div>

      <div className="px-5 pb-4">
        <div
          className={`rounded-2xl px-4 py-3 flex flex-col items-center justify-center gap-2 border ${
            isDark ? "border-[#1b2335] bg-[#050c18]" : "border-zinc-200 bg-zinc-50"
          }`}
        >
          {starting ? (
            <div className="flex flex-col items-center gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <div className="relative h-1.5 w-32 rounded-full bg-slate-800/60 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-200 transition-all"
                    style={{
                      width: `${
                        Math.min(
                          100,
                          (startingSeconds / (startingMode === "off" ? 30 : 60)) * 100,
                        )
                      }%`,
                    }}
                  />
                </div>
                <span
                  className={`font-mono ${
                    isDark ? "text-slate-200" : "text-zinc-800"
                  }`}
                >
                  {startingSeconds}s / {startingMode === "off" ? "30s" : "60s"}
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight ${
                  startingMode === "off"
                    ? isDark
                      ? "bg-red-600/15 text-red-400 border border-red-500/40 shadow-[0_0_18px_rgba(248,113,113,0.45)]"
                      : "bg-red-50 text-red-600 border border-red-400/60 shadow-[0_0_14px_rgba(248,113,113,0.45)]"
                    : isDark
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-400/40 shadow-[0_0_18px_rgba(16,185,129,0.6)]"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-400/70 shadow-[0_0_14px_rgba(16,185,129,0.7)]"
                }`}
              >
                {startingMode === "off" ? "در حال خاموش شدن..." : "در حال روشن شدن..."}
              </span>
            </div>
          ) : (
            <>
              <div
                className={`inline-flex items-center rounded-full p-1 text-[11px] border ${
                  isDark ? "border-slate-700 bg-slate-900" : "border-zinc-300 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(true)}
                  disabled={!active || busy || !canControl}
                  className={`px-3 py-1 rounded-full transition ${
                    powerOn
                      ? isDark
                        ? "bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                        : "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                      : isDark
                        ? "text-slate-300"
                        : "text-zinc-600"
                  } ${
                    !active || busy || !canControl
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  روشن
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(false)}
                  disabled={!active || busy || !canControl}
                  className={`px-3 py-1 rounded-full transition ${
                    !powerOn
                      ? "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                      : isDark
                        ? "text-slate-300"
                        : "text-zinc-600"
                  } ${
                    !active || busy || !canControl
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  خاموش
                </button>
              </div>
              <span
                className={`text-[11px] ${
                  powerOn
                    ? isDark
                      ? "text-emerald-300"
                      : "text-emerald-700"
                    : isDark
                      ? "text-slate-400"
                      : "text-zinc-500"
                }`}
              >
                وضعیت: {powerOn ? "روشن" : "خاموش"}
              </span>
            </>
          )}
        </div>
      </div>

      {timerOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`relative w-full max-w-md mx-4 rounded-3xl border shadow-2xl ${
              isDark
                ? "border-[#1f2937] bg-[#020617] text-slate-50"
                : "border-zinc-200 bg-white text-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold">تنظیم تایمر چیلر</span>
              <span className="text-xs text-slate-400">
                  تعیین کن چه زمانی چیلر به‌صورت خودکار روشن یا خاموش شود
                </span>
              </div>
              <button
                dir="rtl"
                type="button"
                onClick={() => setTimerOpen(false)}
                className="h-8 w-8 rounded-full border border-slate-600 text-sm text-slate-300 hover:bg-slate-800"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className={isDark ? "text-slate-300" : "text-zinc-700"}>
                  وضعیت فعلی:{" "}
                  <span
                    className={
                      powerOn
                        ? isDark
                          ? "text-emerald-300"
                          : "text-emerald-600"
                        : "text-red-500"
                    }
                  >
                    {powerOn ? "روشن" : "خاموش"}
                  </span>
                </span>
                <span
                  className={`font-mono text-[11px] ltr ${
                    isDark ? "text-slate-500" : "text-zinc-500"
                  }`}
                >
                  {timerTarget && timerMode
                    ? `${timerMode === "on" ? "روشن در" : "خاموش در"} ${remainingHms}`
                    : "بدون زمان‌بندی فعال"}
                </span>
              </div>

              <div
                className={`rounded-2xl px-3 py-2 flex items-center justify-between text-xs border ${
                  isDark
                    ? "border-[#111827] bg-[#020617]"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <span className={isDark ? "text-slate-300" : "text-zinc-700"}>
                  نوع عمل
                </span>
                <div
                  className={`inline-flex items-center rounded-full text-xs border ${
                    isDark
                      ? "border-[#1f2937] bg-[#020617]"
                      : "border-zinc-300 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setTimerMode("on")}
                    className={`px-3 py-1 rounded-full transition ${
                      timerMode === "on"
                        ? "bg-emerald-500 text-white shadow-[0_0_14px_rgba(16,185,129,0.7)]"
                        : isDark
                          ? "text-slate-300"
                          : "text-zinc-700"
                    }`}
                  >
                    روشن شود
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimerMode("off")}
                    className={`px-3 py-1 rounded-full transition ${
                      timerMode === "off"
                        ? "bg-red-500 text-white shadow-[0_0_14px_rgba(248,113,113,0.7)]"
                        : isDark
                          ? "text-slate-300"
                          : "text-zinc-700"
                    }`}
                  >
                    خاموش شود
                  </button>
                </div>
              </div>

              <div
                className={`rounded-2xl px-3 py-3 space-y-3 border ${
                  isDark
                    ? "border-[#111827] bg-[#020617]"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={isDark ? "text-slate-300" : "text-zinc-700"}>
                    تاریخ و ساعت اجرا
                  </span>
                  <span
                    className={`text-[11px] ${
                      isDark ? "text-slate-400" : "text-zinc-500"
                    }`}
                  >
                    {timerJDate
                      ? `${jalaliMonthNames[timerJDate.jm - 1]} ${toPersianNumber(
                          timerJDate.jd,
                        )}، ${toPersianNumber(timerJDate.jy)}`
                      : "-"}
                  </span>
                </div>

                <div
                  className={`rounded-2xl border px-3 py-2 text-xs ${
                    isDark
                      ? "border-[#1f2937] bg-[#020617]"
                      : "border-zinc-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        let y = calendarYear;
                        let m = calendarMonthIndex - 1;
                        if (m < 1) {
                          m = 12;
                          y -= 1;
                        }
                        setCalendarYear(y);
                        setCalendarMonthIndex(m);
                      }}
                      className={`h-7 w-7 flex items-center justify-center rounded-full text-xs ${
                        isDark
                          ? "bg-slate-900 text-slate-200"
                          : "bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      ‹
                    </button>
                    <span
                      className={`text-[11px] font-medium ${
                        isDark ? "text-slate-100" : "text-zinc-800"
                      }`}
                    >
                      {jalaliMonthNames[calendarMonthIndex - 1]}{" "}
                      {toPersianNumber(calendarYear)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        let y = calendarYear;
                        let m = calendarMonthIndex + 1;
                        if (m > 12) {
                          m = 1;
                          y += 1;
                        }
                        setCalendarYear(y);
                        setCalendarMonthIndex(m);
                      }}
                      className={`h-7 w-7 flex items-center justify-center rounded-full text-xs ${
                        isDark
                          ? "bg-slate-900 text-slate-200"
                          : "bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      ›
                    </button>
                  </div>

                  {(() => {
                    const daysInMonth = jalaaliMonthLength(
                      calendarYear,
                      calendarMonthIndex,
                    );
                    const g = toGregorian(calendarYear, calendarMonthIndex, 1);
                    const firstWeekday = new Date(
                      g.gy,
                      g.gm - 1,
                      g.gd,
                    ).getDay();
                    const offset = (firstWeekday + 1) % 7;
                    const cells: (number | null)[] = [];
                    for (let i = 0; i < offset; i += 1) {
                      cells.push(null);
                    }
                    for (let d = 1; d <= daysInMonth; d += 1) {
                      cells.push(d);
                    }
                    while (cells.length % 7 !== 0) {
                      cells.push(null);
                    }
                    const rows: (number | null)[][] = [];
                    for (let i = 0; i < cells.length; i += 7) {
                      rows.push(cells.slice(i, i + 7));
                    }
                    return (
                      <div className="space-y-1">
                        <div className="grid grid-cols-7 text-center text-[10px] mb-1">
                          {jalaliWeekdaysShort.map((d) => (
                            <div
                              key={d}
                              className={
                                isDark ? "text-slate-400" : "text-zinc-500"
                              }
                            >
                              {d}
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1">
                          {rows.map((week, wi) => (
                            <div
                              key={wi}
                              className="grid grid-cols-7 text-center gap-1"
                            >
                              {week.map((day, di) => {
                                if (!day) {
                                  return (
                                    <div
                                      key={di}
                                      className="h-7 text-[11px]"
                                    />
                                  );
                                }
                                const isSelected =
                                  timerJDate &&
                                  timerJDate.jy === calendarYear &&
                                  timerJDate.jm === calendarMonthIndex &&
                                  timerJDate.jd === day;
                                return (
                                  <button
                                    key={di}
                                    type="button"
                                    onClick={() => {
                                      const jd = {
                                        jy: calendarYear,
                                        jm: calendarMonthIndex,
                                        jd: day,
                                      };
                                      setTimerJDate(jd);
                                    }}
                                    className={`h-7 flex items-center justify-center rounded-full text-[11px] ${
                                      isSelected
                                        ? "bg-emerald-500 text-white"
                                        : isDark
                                          ? "text-slate-100 hover:bg-slate-800"
                                          : "text-zinc-800 hover:bg-zinc-100"
                                    }`}
                                  >
                                    {toPersianNumber(day)}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-between text-xs mt-3">
                  <span className={isDark ? "text-slate-300" : "text-zinc-700"}>
                    ساعت اجرا
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={timerHour}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (Number.isNaN(v)) return;
                        setTimerHour(Math.max(0, Math.min(23, v)));
                      }}
                      className={`rounded-xl border px-2 py-1 text-[11px] ltr ${
                        isDark
                          ? "bg-[#020617] border-[#1f2937] text-slate-100"
                          : "bg-white border-zinc-300 text-zinc-800"
                      }`}
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i} value={i}>
                          {toPersianNumber(String(i).padStart(2, "0"))}
                        </option>
                      ))}
                    </select>
                    <span className={isDark ? "text-slate-500" : "text-zinc-500"}>
                      :
                    </span>
                    <select
                      value={timerMinute}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (Number.isNaN(v)) return;
                        setTimerMinute(Math.max(0, Math.min(59, v)));
                      }}
                      className={`rounded-xl border px-2 py-1 text-[11px] ltr ${
                        isDark
                          ? "bg-[#020617] border-[#1f2937] text-slate-100"
                          : "bg-white border-zinc-300 text-zinc-800"
                      }`}
                    >
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const val = idx * 5;
                        return (
                          <option key={val} value={val}>
                            {toPersianNumber(String(val).padStart(2, "0"))}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              <div
                className={`rounded-2xl px-3 py-2 text-xs ${
                  isDark ? "bg-[#020617] text-slate-300" : "bg-zinc-50 text-zinc-700"
                }`}
              >
                {timerMode
                  ? `چیلر ${
                      timerMode === "on" ? "به‌صورت خودکار روشن" : "به‌صورت خودکار خاموش"
                    } می‌شود.`
                  : "نوع عمل (روشن یا خاموش شدن) را انتخاب کنید."}
              </div>
            </div>

            <div className="px-5 pb-4 flex items-center justify-between gap-2">
              {timerTarget && (
                <button
                  type="button"
                  onClick={() => {
                    cancelTimer();
                    setTimerOpen(false);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    isDark
                      ? "bg-transparent border border-slate-600 text-slate-200"
                      : "bg-transparent border border-zinc-300 text-zinc-700"
                  }`}
                >
                  حذف زمان‌بندی
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setTimerOpen(false)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    isDark
                      ? "bg-slate-800 text-slate-100"
                      : "bg-zinc-200 text-zinc-800"
                  }`}
                >
                  بستن
                </button>
                <button
                  type="button"
                  onClick={() => {
                    startTimer();
                    if (canSubmitTimer) {
                      setTimerOpen(false);
                    }
                  }}
                  disabled={!canSubmitTimer}
                  className={`rounded-xl px-4 py-1.5 text-xs font-semibold ${
                    !canSubmitTimer
                      ? "bg-slate-600/40 text-slate-300 cursor-not-allowed"
                      : "bg-[#ff8a3c] text-slate-900 shadow-[0_8px_20px_rgba(255,138,60,0.55)]"
                  }`}
                >
                  ثبت زمان‌بندی
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 pb-4">
        <div
          className={`rounded-2xl px-4 py-4 flex flex-col gap-3 border ${
            isDark ? "border-[#1b2335] bg-[#050c18]" : "border-zinc-200 bg-zinc-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${
                isDark ? "text-slate-300" : "text-zinc-600"
              }`}
            >
              تنظیم دما (°C)
            </span>
            <span className="text-3xl font-semibold tracking-tight">
              {setpoint.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={incSetpoint}
              disabled={!canControl || busy}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                isDark
                  ? "bg-[#0a1424] text-slate-200 border-[#222c3f]"
                  : "bg-white text-zinc-700 border-zinc-300"
              }`}
            >
              +
            </button>
            <input
              type="range"
              min={spMin}
              max={spMax}
              step={spStep}
              value={setpoint}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isNaN(v)) return;
                const now = Date.now();
                setLastCmdAt(now);
                setLastUserAdjustAt(now);
                setSetpoint(v);
              }}
              disabled={!canControl || busy}
              className="flex-1 accent-[#1da1f2] ltr"
            />
            
            <button
              type="button"
              onClick={decSetpoint}
              disabled={!canControl || busy}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                isDark
                  ? "bg-[#0a1424] text-slate-200 border-[#222c3f]"
                  : "bg-white text-zinc-700 border-zinc-300"
              }`}
            >
              -
            </button>
          </div>
          <div
            className={`flex items-center justify-between ${
              isDark ? "text-slate-200" : "text-zinc-800"
            }`}
          >
            <span className="text-xs font-semibold">دمای تنظیم شده:</span>
            <span
              className={`ltr font-extrabold text-2xl sm:text-3xl tracking-tight ${
                isDark ? "text-sky-400" : "text-sky-600"
              } ${savedSetpoint != null ? "animate-pulse" : ""}`}
            >
              {savedSetpoint != null ? savedSetpoint.toFixed(1) : "-"}
            </span>
          </div>
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={applySetpoint}
              disabled={!canControl || busy}
              className={`px-6 py-2 text-xs font-semibold rounded-full transition ${
                !canControl || busy
                  ? "bg-[#ff8a3c]/30 text-slate-800 cursor-not-allowed"
                  : "bg-[#ff8a3c] text-slate-900 hover:bg-[#ff993f]"
              } ${
                applyHighlight
                  ? "animate-pulse ring-2 ring-offset-2 ring-offset-transparent ring-[#fed7aa]"
                  : ""
              }`}
            >
              اعمال دمای جدید
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pb-4">
        <div
          className={`rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs border ${
            isDark
              ? "border-[#1b2335] bg-[#050c18] text-slate-300"
              : "border-zinc-200 bg-zinc-50 text-zinc-600"
          }`}
        >
          <span>دمای فعلی:</span>
          <span className="font-semibold">
            {tempCurrent != null ? tempCurrent.toFixed(1) : "-"}
            <span className="mr-1">°C</span>
          </span>
        </div>
      </div>
    </div>
  );
}
