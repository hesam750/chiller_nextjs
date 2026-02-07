import React from "react";
import { useI18n } from "@/app/_components/i18n";

type PdgItem = {
  id: string;
  name: string;
  ip: string;
  active: boolean;
  url: string;
};

type Props = {
  theme: "dark" | "light";
  pdgs: PdgItem[];
  canEditChillers: boolean;
  onAddClick: () => void;
  onOpenPdg: (item: PdgItem) => void;
  onDeletePdg: (id: string) => void;
};

export function AdminPdgPanel({
  theme,
  pdgs,
  canEditChillers,
  onAddClick,
  onOpenPdg,
  onDeletePdg,
}: Props) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">{t("pdg.list")}</h2>
          <p className="mt-1 text-[11px] text-slate-400">{t("pdg.help")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">
            {pdgs.length} {t("pdg.device")}
          </span>
          {canEditChillers && (
            <button
              type="button"
              onClick={onAddClick}
              className={
                theme === "dark"
                  ? "rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
                  : "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              }
            >
              {t("pdg.add")}
            </button>
          )}
        </div>
      </div>

      {pdgs.length === 0 ? (
        <div
          className={
            theme === "dark"
              ? "rounded-xl border border-dashed border-slate-700 px-4 py-6 text-center text-xs text-slate-500"
                : "rounded-xl border border-dashed border-[#e6edf7] px-4 py-6 text-center text-xs text-slate-500 bg-[#fbfcff]"
          }
        >
          {t("pdg.empty")}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {pdgs.map((pdg) => (
            <div
              key={pdg.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenPdg(pdg)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenPdg(pdg);
                }
              }}
              className={
                theme === "dark"
                  ? `group relative flex flex-col items-stretch rounded-2xl border px-4 py-3 text-left transition ${
                      pdg.active
                        ? "border-emerald-500/40 bg-slate-900/80 hover:bg-slate-900"
                        : "border-slate-800 bg-slate-950/80 opacity-80 hover:bg-slate-900/70"
                    }`
                  : `group relative flex flex-col items-stretch rounded-2xl border px-4 py-3 text-left transition ${
                      pdg.active
                        ? "border-[#e6edf7] bg-[#fbfcff] hover:bg-[#eef6ff]"
                        : "border-[#e6edf7] bg-[#f4f7fb] opacity-80 hover:bg-[#eaf1fb]"
                    }`
              }
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 shadow-inner">
                  <div className="h-7 w-5 rounded-md border border-slate-500 bg-slate-900 flex items-center justify-center text-[9px] font-semibold tracking-tight text-slate-200">
                    PDG
                  </div>
                  <span className="absolute -bottom-1 h-1 w-6 rounded-full bg-slate-700/80" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-50">
                    {pdg.name || t("no.name")}
                  </span>
                  <span className="text-[11px] text-slate-400 ltr">
                    {pdg.ip}/pdg.index
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                    pdg.active ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${pdg.active ? "bg-emerald-400" : "bg-slate-500"}`} />
                  {pdg.active ? t("status.active") : t("status.inactive")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 group-hover:text-blue-300">{t("open.newtab")}</span>
                  {canEditChillers && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(t("pdg.confirm.delete"))) {
                          onDeletePdg(pdg.id);
                        }
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
