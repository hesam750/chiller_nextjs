// utils/jalaali.ts
import jalaali from "jalaali-js";

export type JDate = { year: number; month: number; day: number };

export function toJalali(date: Date): JDate {
  const j = jalaali.toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return { year: j.jy, month: j.jm, day: j.jd };
}

export function toGregorian(jDate: JDate): Date {
  const g = jalaali.toGregorian(jDate.year, jDate.month, jDate.day);
  return new Date(g.gy, g.gm - 1, g.gd);
}

export function jalaaliMonthLength(year: number, month: number): number {
  return jalaali.jalaaliMonthLength(year, month);
}
