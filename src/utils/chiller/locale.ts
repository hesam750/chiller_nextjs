// utils/locale.ts
import { Locale } from "@/app/_components/i18n";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toLocalizedNumber(n: number, locale: Locale): string {
  const digits = locale === "fa" ? FA_DIGITS : locale === "ar" ? AR_DIGITS : undefined;
  if (!digits) return String(n);
  return String(n).replace(/\d/g, (d) => digits[+d]);
}

const TIME_UNITS: Record<Locale, { day: string; hour: string; minute: string; second: string }> = {
  fa: { day: "روز", hour: "ساعت", minute: "دقیقه", second: "ثانیه" },
  ar: { day: "يوم", hour: "ساعة", minute: "دقيقة", second: "ثانية" },
  en: { day: "day", hour: "hour", minute: "minute", second: "second" },
};

const AND_WORD: Record<Locale, string> = { fa: " و ", ar: " و ", en: " and " };

export function formatForwardUnits(totalSeconds: number, locale: Locale): string {
  if (totalSeconds <= 0) {
    return locale === "fa" ? "کمتر از یک ثانیه" : locale === "ar" ? "أقل من ثانية" : "less than a second";
  }
  const u = TIME_UNITS[locale];
  const and = AND_WORD[locale];
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${toLocalizedNumber(days, locale)} ${u.day}`);
  if (hours > 0) parts.push(`${toLocalizedNumber(hours, locale)} ${u.hour}`);
  if (minutes > 0) parts.push(`${toLocalizedNumber(minutes, locale)} ${u.minute}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${toLocalizedNumber(seconds, locale)} ${u.second}`);

  return parts.join(and);
}
