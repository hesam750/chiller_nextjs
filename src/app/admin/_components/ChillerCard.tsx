import React from "react";
import { useI18n } from "@/app/_components/i18n";

type Chiller = {
  id: string;
  name: string;
  ip: string;
  active: boolean;
};

type Props = {
  theme: "dark" | "light";
  chiller: Chiller;
  canEditChillers: boolean;
  progressDefaultOn: number;
  progressDefaultOff: number;
  progress?: { progressOnSeconds: number; progressOffSeconds: number } | null;
  onChangeChiller: (id: string, patch: Partial<Chiller>) => void;
  onChangeProgress: (id: string, next: { progressOnSeconds: number; progressOffSeconds: number }) => void;
  onSave: (c: Chiller) => void;
  onDelete: (id: string) => void;
  onSaveProgress: (c: Chiller) => void;
};

export function ChillerCard({
  theme,
  chiller,
  canEditChillers,
  progressDefaultOn,
  progressDefaultOff,
  progress,
  onChangeChiller,
  onChangeProgress,
  onSave,
  onDelete,
  onSaveProgress,
}: Props) {
  const { t } = useI18n();
  const pOn = progress?.progressOnSeconds ?? progressDefaultOn;
  const pOff = progress?.progressOffSeconds ?? progressDefaultOff;
  return (
    <div
      className={
        theme === "dark"
          ? `rounded-2xl border bg-slate-950 px-4 py-3 shadow-lg ${
              chiller.active ? "border-emerald-500/40" : "border-slate-800 opacity-80"
            }`
          : `rounded-2xl border bg-[#fbfcff] px-4 py-3 shadow-lg ${
              chiller.active ? "border-emerald-500/40" : "border-[#e6edf7] opacity-80"
            }`
      }
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold text-sm">{chiller.name}</div>
          <div className="text-[11px] text-slate-500 ltr">{chiller.ip}</div>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
            chiller.active ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700/40 text-slate-300"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-current" />
          {chiller.active ? t("status.active") : t("status.inactive")}
        </span>
      </div>
      <div className="space-y-2 mt-2">
        <input
          className={
            theme === "dark"
              ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
              : "w-full rounded-lg border border-[#dbe5f1] bg-[#ffffff] px-3 py-1.5 text-xs text-[#334155]"
          }
          value={chiller.name}
          readOnly={!canEditChillers}
          onChange={(e) => onChangeChiller(chiller.id, { name: e.target.value })}
        />
        <input
          className={
            theme === "dark"
              ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs ltr text-slate-100"
              : "w-full rounded-lg border border-[#dbe5f1] bg-[#ffffff] px-3 py-1.5 text-xs ltr text-[#334155]"
          }
          value={chiller.ip}
          readOnly={!canEditChillers}
          onChange={(e) => onChangeChiller(chiller.id, { ip: e.target.value })}
        />
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <span>{t("status.active")}</span>
          <input
            type="checkbox"
            checked={chiller.active}
            disabled={!canEditChillers}
            onChange={(e) => onChangeChiller(chiller.id, { active: e.target.checked })}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t("progress.on")}</label>
            <input
              type="number"
              min={1}
              className={
                theme === "dark"
                  ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
              : "w-full rounded-lg border border-[#dbe5f1] bg-[#ffffff] px-3 py-1.5 text-xs text-[#334155]"
              }
              value={pOn}
              readOnly={!canEditChillers}
              onChange={(e) =>
                onChangeProgress(chiller.id, {
                  progressOnSeconds: Math.max(1, Math.round(Number(e.target.value) || 0)),
                  progressOffSeconds: pOff,
                })
              }
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t("progress.off")}</label>
            <input
              type="number"
              min={1}
              className={
                theme === "dark"
                  ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
              : "w-full rounded-lg border border-[#dbe5f1] bg-[#ffffff] px-3 py-1.5 text-xs text-[#334155]"
              }
              value={pOff}
              readOnly={!canEditChillers}
              onChange={(e) =>
                onChangeProgress(chiller.id, {
                  progressOnSeconds: pOn,
                  progressOffSeconds: Math.max(1, Math.round(Number(e.target.value) || 0)),
                })
              }
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSave(chiller)}
            disabled={!canEditChillers}
            className="flex-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white"
          >
            {t("save")}
          </button>
          <button
            type="button"
            onClick={() => onDelete(chiller.id)}
            disabled={!canEditChillers}
            className="flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white"
          >
            {t("delete")}
          </button>
          <button
            type="button"
            onClick={() => onSaveProgress(chiller)}
            disabled={!canEditChillers}
            className="flex-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white"
          >
            {t("progress.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
