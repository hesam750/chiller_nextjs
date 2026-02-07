import React from "react";
import { useI18n } from "@/app/_components/i18n";

type Props = {
  theme: "dark" | "light";
  canEditChillers: boolean;
  msg: string;
  name: string;
  ip: string;
  active: boolean;
  onChangeName: (v: string) => void;
  onChangeIp: (v: string) => void;
  onChangeActive: (v: boolean) => void;
  onAdd: () => void;
  onReload: () => void;
};

export function AdminAddChillerSection({
  theme,
  canEditChillers,
  msg,
  name,
  ip,
  active,
  onChangeName,
  onChangeIp,
  onChangeActive,
  onAdd,
  onReload,
}: Props) {
  const { t } = useI18n();
  return (
    <section
      className={
        theme === "dark"
          ? "lg:col-span-12 rounded-2xl border border-slate-800 bg-slate-950 shadow-xl"
          : "lg:col-span-12 rounded-2xl border border-[#e6edf7] bg-[#fbfcff] shadow-xl"
      }
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="text-sm font-semibold">{t("chillers.add")}</div>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div className="grid gap-3 md-grid-1_1_auto_auto items-end">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t("name")}</label>
            <input
              className={
                theme === "dark"
                  ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  : "w-full rounded-lg border border-[#dbe5f1] bg-[#ffffff] px-3 py-2 text-sm text-[#334155]"
              }
              placeholder={t("chiller.name.placeholder")}
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t("ip.address")}</label>
            <input
              className={
                theme === "dark"
                  ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm ltr text-left text-slate-100"
                  : "w-full rounded-lg border border-[#dbe5f1] bg-[#ffffff] px-3 py-2 text-sm ltr text-left text-[#334155]"
              }
              placeholder={t("ip.placeholder")}
              value={ip}
              onChange={(e) => onChangeIp(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <span>{t("status.active")}</span>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => onChangeActive(e.target.checked)}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAdd}
              disabled={!canEditChillers}
              className={
                theme === "dark"
                  ? "rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white"
                  : "rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              }
            >
              {t("chillers.add")}
            </button>
            {/* <button
              type="button"
              onClick={onReload}
              className={
                theme === "dark"
                  ? "rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                  : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 hover:bg-slate-50"
              }
            >
              تازه‌سازی لیست
            </button> */}
          </div>
        </div>
        <div className="text-xs text-slate-400 min-h-[20px]">{msg}</div>
      </div>
    </section>
  );
}
