"use client";
import { useI18n } from "@/app/_components/i18n";
import type { ActivityLog } from "@/hooks/admin/useAdminActivity";
import type { Theme } from "@/hooks/admin/useAdminTheme";

interface ActivityPanelProps {
  theme: Theme;
  activityLogs: ActivityLog[];
  activityLoading: boolean;
  onShowMore: () => void;
}

function formatActivityTitle(action: string, t: (key: string) => string): string {
  const actionMap: Record<string, string> = {
    "user.create": "action.user.create",
    "user.update": "action.user.update",
    "user.deactivate": "action.user.deactivate",
    "user.delete": "action.user.delete",
    "auth.login": "action.auth.login",
    "chiller.create": "action.chiller.create",
    "chiller.update": "action.chiller.update",
    "chiller.delete": "action.chiller.delete",
    "settings.update_global": "action.settings.update_global",
    "settings.update_chiller": "action.settings.update_chiller",
  };
  return actionMap[action] ? t(actionMap[action]) : action;
}

function ActivityItem({ log, theme, t }: { log: ActivityLog; theme: Theme; t: (key: string) => string }) {
  const atText = new Date(log.at).toLocaleString(
    typeof document !== "undefined"
      ? (document.documentElement.getAttribute("lang") === "en"
          ? "en-US"
          : document.documentElement.getAttribute("lang") === "ar"
            ? "ar"
            : "fa-IR")
      : "fa-IR",
  );
  const title = formatActivityTitle(log.action, t);
  const d = log.details as Record<string, unknown> | undefined;
  const detailText =
    d && typeof d.target === "string"
      ? String(d.target)
      : d && typeof d.name === "string"
        ? String(d.name)
        : "";

  return (
    <li
      className={
        theme === "dark"
          ? "rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
          : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          {detailText && <span className="text-slate-400">{detailText}</span>}
        </div>
        <span className="ltr text-slate-400">{atText}</span>
      </div>
      <div className="mt-1 text-slate-400">
        {t("admin.activity.by")} <span className="font-semibold">{log.username}</span>
      </div>
    </li>
  );
}

export function ActivityPanel({ theme, activityLogs, activityLoading, onShowMore }: ActivityPanelProps) {
  const { t } = useI18n();

  return (
    <section
      className={
        theme === "dark"
          ? "mt-4 rounded-2xl border border-slate-800 bg-slate-950 shadow-xl px-4 py-4"
          : "mt-4 rounded-2xl border border-[#e6edf7] bg-[#fbfcff] shadow-xl px-4 py-4"
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{t("admin.activity.title")}</h2>
          {activityLogs.length > 5 && (
            <span
              className={
                theme === "dark"
                  ? "rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300"
                  : "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
              }
            >
              {activityLogs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activityLogs.length > 5 && (
            <button
              type="button"
              onClick={onShowMore}
              className={
                theme === "dark"
                  ? "rounded-lg border border-slate-600 bg-slate-900 px-3 py-1 text-xs text-slate-100"
                  : "rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800"
              }
            >
              {t("admin.activity.more")}
            </button>
          )}
        </div>
      </div>
      {activityLogs.length === 0 ? (
        <div
          className={
            theme === "dark"
              ? "rounded-xl border border-dashed border-slate-700 px-4 py-6 text-center text-xs text-slate-500"
              : "rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500 bg-white"
          }
        >
          {activityLoading ? t("admin.activity.loading") : t("admin.activity.empty")}
        </div>
      ) : (
        <ul className="space-y-2">
          {activityLogs.slice(0, 5).map((a) => (
            <ActivityItem key={a.id} log={a} theme={theme} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

interface ActivityModalProps {
  theme: Theme;
  isOpen: boolean;
  onClose: () => void;
  activityLogs: ActivityLog[];
  activityLoading: boolean;
  activityUserFilter: string;
  setActivityUserFilter: (v: string) => void;
  setActivityLimit: (v: number) => void;
}

export function ActivityModal({
  theme,
  isOpen,
  onClose,
  activityLogs,
  activityLoading,
  activityUserFilter,
  setActivityUserFilter,
  setActivityLimit,
}: ActivityModalProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3">
      <div
        className={
          theme === "dark"
            ? "w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl"
            : "w-full max-w-2xl rounded-2xl border border-slate-300 bg-white p-5 shadow-2xl"
        }
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{t("admin.activity.title")}</h3>
            <span
              className={
                theme === "dark"
                  ? "rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300"
                  : "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
              }
            >
              {activityLogs.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={
              theme === "dark"
                ? "rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                : "rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700"
            }
          >
            {t("modal.close")}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <input
            value={activityUserFilter}
            onChange={(e) => {
              setActivityUserFilter(e.target.value);
              setActivityLimit(2000);
            }}
            placeholder={t("admin.activity.filter.placeholder")}
            className={
              theme === "dark"
                ? "rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
                : "rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800"
            }
          />
          <button
            type="button"
            onClick={() => {
              setActivityUserFilter("");
              setActivityLimit(2000);
            }}
            className={
              theme === "dark"
                ? "rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
                : "rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800"
            }
          >
            {t("admin.activity.filter.clear")}
          </button>
        </div>
        {activityLogs.length === 0 ? (
          <div
            className={
              theme === "dark"
                ? "rounded-xl border border-dashed border-slate-700 px-4 py-6 text-center text-xs text-slate-500"
                : "rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500 bg-white"
            }
          >
            {activityLoading ? t("admin.activity.loading") : t("admin.activity.empty")}
          </div>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-auto pr-1">
            {activityLogs.map((a) => (
              <ActivityItem key={a.id} log={a} theme={theme} t={t} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
