"use client";
import { useState } from "react";
import { useI18n } from "@/app/_components/i18n";
import type { Theme } from "@/hooks/admin/useAdminTheme";

interface PdgModalProps {
  theme: Theme;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, ip: string) => Promise<void>;
}

export function PdgModal({ theme, isOpen, onClose, onAdd }: PdgModalProps) {
  const { t } = useI18n();
  const [pdgName, setPdgName] = useState("");
  const [pdgIp, setPdgIp] = useState("");
  const [adding, setAdding] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async () => {
    if (!pdgName.trim() || !pdgIp.trim()) return;
    setAdding(true);
    await onAdd(pdgName, pdgIp);
    setPdgName("");
    setPdgIp("");
    setAdding(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={
          theme === "dark"
            ? "w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl"
            : "w-full max-w-md rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl"
        }
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t("pdg.manage")}</h3>
          <button
            type="button"
            onClick={onClose}
            className={
              theme === "dark"
                ? "rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                : "rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-400 mb-2 block">{t("pdg.name")}</label>
            <input
              type="text"
              value={pdgName}
              onChange={(e) => setPdgName(e.target.value)}
              placeholder={t("pdg.name.placeholder")}
              className={
                theme === "dark"
                  ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400 mb-2 block">{t("pdg.ip")}</label>
            <input
              type="text"
              value={pdgIp}
              onChange={(e) => setPdgIp(e.target.value)}
              placeholder={t("ip.placeholder")}
              className={
                theme === "dark"
                  ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm ltr text-slate-100"
                  : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm ltr text-slate-900"
              }
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={
                theme === "dark"
                  ? "flex-1 rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                  : "flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              }
            >
              {t("pdg.cancel")}
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!pdgName.trim() || !pdgIp.trim() || adding}
              className={
                theme === "dark"
                  ? "flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  : "flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              }
            >
              {adding ? t("loading.generic") : t("pdg.add")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
