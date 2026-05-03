// utils/chiller/numberHelpers.ts

const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toLocalizedNumber(value: number | string, locale: string): string {
  const str = String(value);
  if (locale === "fa") {
    return str.replace(/\d/g, (d) => persianDigits[parseInt(d)]);
  }
  return str;
}
