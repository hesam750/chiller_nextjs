 "use client";
 
 import { useI18n, Locale } from "./i18n";
 
 const order: Locale[] = ["fa", "ar", "en"];
 
 export function LanguageSwitcher({ className }: { className?: string }) {
   const { locale, setLocale, t } = useI18n();
   const next = order[(order.indexOf(locale) + 1) % order.length];
   const baseClass =
     className ||
     "fixed top-4 left-4 z-50 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 shadow-lg hover:bg-slate-800";
   return (
     <button
       type="button"
       onClick={() => setLocale(next)}
       title={`${t("lang.fa")} / ${t("lang.ar")} / ${t("lang.en")}`}
       className={baseClass}
     >
       {locale === "fa" ? "FA" : locale === "ar" ? "AR" : "EN"}
     </button>
   );
 }
