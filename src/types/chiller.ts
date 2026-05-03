// src/types/chiller.ts — نسخه اصلاح‌شده

export type SeasonMode = "summer" | "winter";
export type TimerMode = "on" | "off" | null;
export type PowerMode = "on" | "off";
export type StartingMode = "on" | "off" | null;

export interface ChillerProps {
  name: string;
  ip: string;
  active: boolean;
  mode: PowerMode;
  canControl: boolean;
  progressOnSeconds: number;
  progressOffSeconds: number;

  // اصلاح: قبلاً () => void بود
  onTogglePower: (payload: {
    name: string;
    ip: string;
    next: boolean;
  }) => Promise<{ ok: boolean }>;

  // اصلاح: قبلاً (setpoint: number) => void بود
  onApplySetpoint: (payload: {
    name: string;
    ip: string;
    value: number;
  }) => Promise<{ ok: boolean; actual?: number | null }>;

  // اصلاح: قبلاً (season: SeasonMode) => void بود
  onChangeSeason: (payload: {
    name: string;
    ip: string;
    season: "winter" | "summer";
  }) => Promise<{ ok: boolean }>;
}

// ... بقیه اینترفیس‌ها بدون تغییر
export interface ChillerStatus {
  power: PowerMode;
  tempCurrent: number;
  setpoint: number;
  fanOn: boolean;
  season: SeasonMode;
  uptimeSeconds: number;
}

export interface ChillerState {
  powerOn: boolean;
  fanOn: boolean;
  busy: boolean;
  starting: boolean;
  startingMode: StartingMode;
  startingSeconds: number;
  setpoint: number;
  savedSetpoint: number;
  tempCurrent: number;
  lastCmdAt: number | null;
  lastUserAdjustAt: number | null;
  isOptimalMode: boolean;
  uptimeSeconds: number;
}

export interface TimerState {
  timerMode: TimerMode;
  targetDate: string;
  timerJDate: { year: number; month: number; day: number };
  timerHour: number;
  timerMinute: number;
}

export interface TimerApiResponse {
  mode: TimerMode;
  target: string;
  jDate: string;
  hour: number;
  minute: number;
}
