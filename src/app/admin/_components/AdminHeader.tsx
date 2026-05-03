"use client";
import Image from "next/image";
import { useI18n } from "@/app/_components/i18n";
import { WithAccess } from "@/app/_components/rbac";
import { LanguageSwitcher } from "@/app/_components/LanguageSwitcher";
import fanapLogo from "../../../../fanap.png";
import type { Theme } from "@/hooks/admin/useAdminTheme";
import type { Role } from "@/hooks/admin/useAdminAuth";

interface AdminHeaderProps {
  theme: Theme;
  role: Role;
  onToggleTheme: () => void;
  onOpenUsersModal: () => void;
  onOpenTabsModal: () => void;
}

export function AdminHeader({
  theme,
  role,
  onToggleTheme,
  onOpenUsersModal,
  onOpenTabsModal,
}: AdminHeaderProps) {
  const { t } = useI18n();

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      location.href = "/login";
    });
  };

  return (
    <>
      <header
        className={
          theme === "dark"
            ? "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-6 py-3 border-b border-slate-800 bg-slate-950"
            : "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-6 py-3 border-b border-[#e6edf7] bg-[#f9fafb]"
        }
      >
        <div className="flex items-center gap-2">
          <Image src={fanapLogo} alt="Fanap" className="h-6 w-auto" />
          <strong className="text-sm">{t("admin.header.title")}</strong>
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <a
            href="/dashboard"
            className={
              theme === "dark"
                ? "rounded-lg border border-slate-600 bg-slate-900 px-3 py-1 text-xs text-slate-100"
                : "rounded-lg border border-[#dbe5f1] bg-[#ffffff] px-3 py-1 text-xs text-[#334155] hover:bg-[#eef3fb]"
            }
          >
            {t("admin.nav.dashboard")}
          </a>
          {role === "manager" && (
            <button
              type="button"
              onClick={onOpenUsersModal}
              className={
                theme === "dark"
                  ? "rounded-lg bg-blue-500 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600"
                  : "rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
              }
            >
              {t("admin.users.manage")}
            </button>
          )}
          <WithAccess anyRoles={["admin"]} anyPerms={["canManageTabs"]} loadingFallback={<div>Loading...</div>}>
            <button
              type="button"
              onClick={onOpenTabsModal}
              className={
                theme === "dark"
                  ? "rounded-lg bg-green-500 px-3 py-1 text-xs font-semibold text-white hover:bg-green-600"
                  : "rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700"
              }
            >
              {t("admin.tabs.manage")}
            </button>
          </WithAccess>
          <button
            type="button"
            onClick={onToggleTheme}
            className={
              theme === "dark"
                ? "rounded-lg border border-slate-600 bg-slate-900 px-3 py-1 text-xs"
                : "rounded-lg border border-slate-300 bg-slate-100 px-3 py-1 text-xs"
            }
          >
            {t("theme.label")}: {theme === "dark" ? t("theme.dark") : t("theme.light")}
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogout();
            }}
          >
            <button
              type="submit"
              className={
                theme === "dark"
                  ? "rounded-lg border border-slate-600 bg-slate-900 px-3 py-1 text-xs text-slate-100"
                  : "rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100"
              }
            >
              {t("logout")}
            </button>
          </form>
        </div>
      </header>
      <div className="px-6 pt-2">
        <WithAccess anyPerms={["canChangeLanguage"]}>
          <LanguageSwitcher
            className={
              theme === "dark"
                ? "rounded-lg border border-slate-600 bg-slate-900 px-3 py-1 text-xs text-slate-100"
                : "rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800"
            }
          />
        </WithAccess>
      </div>
    </>
  );
}
