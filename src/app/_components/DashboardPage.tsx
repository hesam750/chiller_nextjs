"use client";

import { useChillerList } from "@/hooks/dashboard/useChillerList";
import { useConnectionStatus } from "@/hooks/dashboard/useConnectionStatus";
import { useProgressSettings } from "@/hooks/dashboard/useProgressSettings";
import { useDashboardTabs } from "@/hooks/dashboard/useDashboardTabs";
import { usePermissions } from "@/hooks/dashboard/usePermissions";
import { useTheme } from "@/hooks/dashboard/useTheme";
import { useToast } from "@/hooks/dashboard/useToast";
import { useChillerActions } from "@/hooks/dashboard/useChillerActions";
import { useIntro } from "@/hooks/dashboard/useIntro";
import { WithAccess } from "./rbac";
import { ChillerCard } from "../components/chiller/ChillerCard";
import fanapLogo from "../../../fanap.png";
import { Toast } from "../components/ui/Toast";
import { useI18n } from "./i18n";

export function DashboardPage() {
  const { t } = useI18n();

  // هـوک‌هـای مختص دیتا
  const { chillers, loading } = useChillerList();
  const { role, username, canControl } = usePermissions();
  const connection = useConnectionStatus(chillers.map(c => c.ip));
  const { progressOnSeconds, progressOffSeconds, progressByChiller } =
    useProgressSettings(chillers);
  const { tabs, selectedTabId, setSelectedTabId, filteredChillers } =
    useDashboardTabs(chillers);

  // هـوک‌هـای مربوط به UI
  const { theme, isDark, toggleTheme } = useTheme();
  const { toast, toastVisible, showToast } = useToast();
  const { introOpen, setIntroOpen } = useIntro();

  // هـوک‌هـای اکشن‌های چیلر
  const { handleTogglePower, handleApplySetpoint, handleChangeSeason } =
    useChillerActions({
      permissions: canControl,
      username,
      showToast,
    });

  // هندلر خروج
  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      window.location.replace("/login");
    });
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isDark ? "bg-[#0f141a] text-zinc-50" : "bg-[#f7f9fc] text-[#1f2937]"
      }`}
    >
      <header
        className={`border-b px-4 py-2 sm:px-6 sm:py-3 ${
          isDark
            ? "border-zinc-800 bg-[#0f1722]"
            : "border-[#e6edf7] bg-[#f9fafb]"
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img src={fanapLogo.src} alt="Fanap" className="h-6 w-auto shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm sm:text:base truncate">
                  {t("app.title")}
                </span>
                <span
                  className={`text-[11px] sm:text-xs truncate ${
                    isDark ? "text-slate-400" : "text-zinc-500"
                  }`}
                >
                  {t("app.subtitle")}
                </span>
              </div>
            </div>
          </div>
          <div
            className={`flex w-full flex-wrap items-center justify-between gap-2 px-2 py-2 rounded-2xl border sm:w-auto sm:justify-end ${
              isDark
                ? "border-zinc-700 bg-white/5"
                : "border-[#dbe5f1] bg-[#eef3fb]"
            }`}
          >
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-xl text-[11px] sm:text-xs font-semibold ${
                connection === "online"
                  ? isDark
                    ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/40"
                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400/40"
                  : connection === "offline"
                  ? isDark
                    ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/40"
                    : "bg-red-50 text-red-600 ring-1 ring-red-400/40"
                  : isDark
                  ? "bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/40"
                  : "bg-amber-50 text-amber-600 ring-1 ring-amber-400/40"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                <circle
                  cx="12"
                  cy="12"
                  r="6"
                  className={
                    connection === "online"
                      ? "fill-emerald-400"
                      : connection === "offline"
                      ? "fill-red-500"
                      : "fill-amber-400"
                  }
                />
              </svg>
              {connection === "online"
                ? t("connection.online")
                : connection === "offline"
                ? t("connection.offline")
                : t("connection.connecting")}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition ${
                isDark
                  ? "bg-white/10 hover:bg-white/15 text-slate-100"
                  : "bg-[#ffffff] hover:bg-[#eef3fb] text-[#334155]"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                <path
                  d="M12 2a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"
                  className={isDark ? "fill-slate-200" : "fill-zinc-800"}
                />
              </svg>
              {theme === "dark" ? t("theme.dark") : t("theme.light")}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition ${
                isDark
                  ? "bg-white/10 hover:bg-white/15 text-slate-100"
                  : "bg-[#ffffff] hover:bg-[#eef3fb] text-[#334155]"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                <path
                  d="M10 3h8a1 1 0 0 1 1 1v4h-2V5h-6v14h6v-3h2v4a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm4 8h-8v2h8v3l4-4-4-4v3z"
                  className={isDark ? "fill-slate-200" : "fill-zinc-800"}
                />
              </svg>
              {t("logout")}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      {tabs.length > 0 && (
        <nav
          className={`flex-shrink-0 flex-grow-0 border-b px-4 py-2 sm:px-6 sm:py-2 ${
            isDark
              ? "border-zinc-800 bg-[#0f1722]"
              : "border-[#e6edf7] bg-[#f9fafb]"
          }`}
        >
          <div className="flex space-x-2 overflow-x-auto">
            {tabs
              .filter(t => t.active)
              .map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTabId(tab.id)}
                  className={`flex-shrink-0 rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                    selectedTabId === tab.id
                      ? isDark
                        ? "bg-blue-600 text-white"
                        : "bg-blue-600 text-white"
                      : isDark
                      ? "text-slate-300 hover:bg-zinc-700 hover:text-white"
                      : "text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {tab.name}
                </button>
              ))}
          </div>
        </nav>
      )}

      <main className="flex-1 px-4 py-4 lg:px-6 lg:py-6">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">{t("chillers")}</h1>
            {loading && (
              <span className="text-xs text-zinc-400">{t("loading.generic")}</span>
            )}
            {!loading && connection === "offline" && (
              <span
                className={`text-[11px] ${
                  isDark ? "text-amber-300" : "text-amber-600"
                }`}
              >
                {t("connection.offline")}
              </span>
            )}
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {filteredChillers.map(c => (
              <ChillerCard
                key={c.id}
                name={c.name}
                ip={c.ip}
                active={c.active}
                // 🔧 تغییر ۱: mode={theme} → isDark={isDark}
                isDark={isDark}
                canControl={canControl}
                progressOnSeconds={
                  progressByChiller[c.id]?.progressOnSeconds ?? progressOnSeconds
                }
                progressOffSeconds={
                  progressByChiller[c.id]?.progressOffSeconds ?? progressOffSeconds
                }
                // 🔧 تغییر ۲: اضافه کردن تایپ صریح به payload
                onTogglePower={(payload: { next: boolean }) =>
                  handleTogglePower({ name: c.name, ip: c.ip, next: payload.next })
                }
                // 🔧 تغییر ۳: اضافه کردن تایپ صریح به value
                onApplySetpoint={(value: number) =>
                  handleApplySetpoint({ name: c.name, ip: c.ip, value })
                }
                // 🔧 تغییر ۴: اضافه کردن تایپ صریح به season
                onChangeSeason={(season: "winter" | "summer") =>
                  handleChangeSeason({ name: c.name, ip: c.ip, season })
                }
              />
            ))}
            {!loading && filteredChillers.length === 0 && (
              <div
                className={`rounded-2xl border border-dashed p-6 text-sm flex items-center justify-center ${
                  isDark
                    ? "border-zinc-700/70 text-zinc-400"
                    : "border-[#e6edf7] text-[#66738a] bg-[#fbfcff]"
                }`}
              >
                {t("chillers.empty")}
              </div>
            )}
          </div>
        </section>
      </main>

      {introOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div
            className={`w-full max-w-md rounded-3xl border shadow-2xl px-6 py-5 flex flex-col items-center gap-4 ${
              isDark
                ? "bg-[#020617] border-slate-700 text-slate-100"
                : "bg-[#fbfcff] border-[#e6edf7] text-[#1f2937]"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-sky-500/40 border-t-transparent animate-spin" />
                <div className="absolute inset-1 rounded-full bg-sky-500/10" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text:center">
                {t("intro.title")}
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-center max-w-sm">
                {t("intro.text")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIntroOpen(false)}
              className={`mt-1 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition ${
                isDark
                  ? "bg-sky-500 text-white hover:bg-sky-400"
                  : "bg-sky-600 text-white hover:bg-sky-500"
              }`}
            >
              {t("intro.ok")}
            </button>
          </div>
        </div>
      )}

      {/* 🔧 تغییر ۵: ToastComponent → Toast با پراپ‌های کامل */}
      <Toast toast={toast} toastVisible={toastVisible} isDark={isDark} />
    </div>
  );
}
