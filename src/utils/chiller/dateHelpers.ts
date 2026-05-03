import jalaali from 'jalaali-js';

export function toJalali(gYear: number, gMonth: number, gDay: number) {
  return jalaali.toJalaali(gYear, gMonth, gDay);
}

export function toGregorian(jYear: number, jMonth: number, jDay: number) {
  return jalaali.toGregorian(jYear, jMonth, jDay);
}

export function jalaaliMonthLength(jYear: number, jMonth: number) {
  return jalaali.jalaaliMonthLength(jYear, jMonth);
}
