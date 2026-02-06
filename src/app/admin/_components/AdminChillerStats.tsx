import React from "react";

type Props = {
  theme: "dark" | "light";
  total: number;
  activeCount: number;
};

export function AdminChillerStats({ theme, total, activeCount }: Props) {
  return (
    <>
      <div
        className={
          theme === "dark"
            ? "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 shadow"
            : "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow"
        }
      >
        <div className="text-[11px] text-slate-400 mb-1">تعداد پکیج‌ها</div>
        <div className="text-2xl font-semibold">{total}</div>
      </div>
      <div
        className={
          theme === "dark"
            ? "rounded-2xl border border-emerald-600/70 bg-emerald-900/10 px-4 py-3 shadow"
            : "rounded-2xl border border-emerald-500/40 bg-emerald-50 px-4 py-3 shadow"
        }
      >
        <div className="text-[11px] text-emerald-300 mb-1">پکیج‌های فعال</div>
        <div className="text-2xl font-semibold text-emerald-300">
          {activeCount}
        </div>
      </div>
    </>
  );
}
