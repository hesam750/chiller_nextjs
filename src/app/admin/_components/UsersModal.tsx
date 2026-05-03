"use client";
import { useState, useCallback } from "react";
import { useI18n } from "@/app/_components/i18n";
import type { User } from "@/hooks/admin/useAdminUsers";
import type { Theme } from "@/hooks/admin/useAdminTheme";

interface UsersModalProps {
  theme: Theme;
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  filteredUsers: User[];
  userSearch: string;
  setUserSearch: (v: string) => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export function UsersModal({
  theme,
  isOpen,
  onClose,
  users,
  setUsers,
  filteredUsers,
  userSearch,
  setUserSearch,
  showToast,
}: UsersModalProps) {
  const { t } = useI18n();
  const [userEditing, setUserEditing] = useState<string | null>(null);
  const [userUsername, setUserUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "manager" | "viewer">("viewer");
  const [userActive, setUserActive] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<"empty" | "weak" | "medium" | "strong">("empty");

  // Permissions state
  const [permViewTimer, setPermViewTimer] = useState(false);
  const [permControlTimer, setPermControlTimer] = useState(false);
  const [permTogglePower, setPermTogglePower] = useState(false);
  const [permSetTemperature, setPermSetTemperature] = useState(false);
  const [permAddPackage, setPermAddPackage] = useState(false);
  const [permManageUsers, setPermManageUsers] = useState(false);
  const [permViewLogs, setPermViewLogs] = useState(false);
  const [permViewChillers, setPermViewChillers] = useState(false);
  const [permViewPdgs, setPermViewPdgs] = useState(false);
  const [permViewUserActivity, setPermViewUserActivity] = useState(false);
  const [permChangeLanguage, setPermChangeLanguage] = useState(false);

  const evaluatePasswordStrength = useCallback((s: string) => {
    const v = String(s || "");
    if (!v.trim().length) {
      setPasswordStrength("empty");
      return;
    }
    let score = 0;
    if (v.length >= 8) score += 1;
    if (/[A-Z]/.test(v)) score += 1;
    if (/[a-z]/.test(v)) score += 1;
    if (/\d/.test(v)) score += 1;
    if (/[^A-Za-z0-9]/.test(v)) score += 1;
    if (score >= 4) setPasswordStrength("strong");
    else if (score >= 3) setPasswordStrength("medium");
    else setPasswordStrength("weak");
  }, []);

  const applyRolePreset = useCallback((r: "admin" | "manager" | "viewer") => {
    if (r === "admin") {
      setPermViewTimer(true);
      setPermControlTimer(true);
      setPermTogglePower(true);
      setPermSetTemperature(true);
      setPermAddPackage(true);
      setPermManageUsers(true);
      setPermViewLogs(true);
      setPermViewChillers(true);
      setPermViewPdgs(true);
      setPermViewUserActivity(true);
      setPermChangeLanguage(true);
    } else if (r === "manager") {
      setPermViewTimer(true);
      setPermControlTimer(true);
      setPermTogglePower(true);
      setPermSetTemperature(true);
      setPermAddPackage(false);
      setPermManageUsers(true);
      setPermViewLogs(true);
      setPermViewChillers(true);
      setPermViewPdgs(true);
      setPermViewUserActivity(true);
      setPermChangeLanguage(true);
    } else {
      setPermViewTimer(true);
      setPermControlTimer(false);
      setPermTogglePower(false);
      setPermSetTemperature(false);
      setPermAddPackage(false);
      setPermManageUsers(false);
      setPermViewLogs(false);
      setPermViewChillers(false);
      setPermViewPdgs(false);
      setPermViewUserActivity(false);
      setPermChangeLanguage(false);
    }
  }, []);

  const resetForm = useCallback(() => {
    setUserEditing(null);
    setUserUsername("");
    setUserPassword("");
    setPasswordStrength("empty");
    setUserRole("viewer");
    setUserActive(true);
    setPermViewTimer(false);
    setPermControlTimer(false);
    setPermTogglePower(false);
    setPermSetTemperature(false);
    setPermAddPackage(false);
    setPermManageUsers(false);
    setPermViewLogs(false);
    setPermViewChillers(false);
    setPermViewPdgs(false);
    setPermViewUserActivity(false);
    setPermChangeLanguage(false);
    setFormError(null);
  }, []);

  const handleSaveUser = useCallback(async () => {
    if (savingUser) return;
    setFormError(null);
    const payload = {
      username: userUsername.trim(),
      password: userPassword,
      role: userRole,
      active: userActive,
      permissions: {
        canViewTimer: permViewTimer,
        canControlTimer: permControlTimer,
        canTogglePower: permTogglePower,
        canSetTemperature: permSetTemperature,
        canAddPackage: permAddPackage,
        canManageUsers: permManageUsers,
        canViewLogs: permViewLogs,
        canViewChillers: permViewChillers,
        canViewPdgs: permViewPdgs,
        canViewUserActivity: permViewUserActivity,
        canChangeLanguage: permChangeLanguage,
      },
    };
    if (!payload.username || !/^[\p{L}\p{N}._-]{3,}$/u.test(payload.username)) {
      setFormError(t("err.user.username.minlen"));
      showToast(t("err.user.username.invalid"), "error");
      return;
    }
    if (!userEditing) {
      if (!payload.password || payload.password.length < 8) {
        setFormError(t("err.password.minlen"));
        showToast(t("err.password.weak"), "error");
        return;
      }
    } else {
      if (payload.password && payload.password.length < 8) {
        setFormError(t("err.password.change.minlen"));
        showToast(t("err.password.weak"), "error");
        return;
      }
    }
    setSavingUser(true);
    const res = await fetch("/api/users", {
      method: userEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        userEditing ? { ...payload, username: userEditing, password: userPassword } : payload,
      ),
    });
    setSavingUser(false);
    if (!res.ok) {
      showToast(t("err.user.save"), "error");
      return;
    }
    const j = await res.json().catch(() => null);
    if (j && j.item) {
      setUsers((prev) => {
        const idx = prev.findIndex((x) => x.username === j.item.username);
        if (idx === -1) {
          return [...prev, { username: j.item.username, role: j.item.role, active: j.item.active, permissions: j.item.permissions }];
        }
        const next = prev.slice();
        next[idx] = { username: j.item.username, role: j.item.role, active: j.item.active, permissions: j.item.permissions };
        return next;
      });
      showToast(userEditing ? t("ok.user.updated") : t("ok.user.added"), "success");
      setUserEditing(j.item.username);
    }
  }, [
    savingUser, userUsername, userPassword, userRole, userActive, userEditing,
    permViewTimer, permControlTimer, permTogglePower, permSetTemperature,
    permAddPackage, permManageUsers, permViewLogs, permViewChillers,
    permViewPdgs, permViewUserActivity, permChangeLanguage, t, showToast, setUsers
  ]);

  const handleDeleteUser = useCallback(async () => {
    if (!userEditing) return;
    if (!confirm(t("user.confirm.delete"))) return;
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: userEditing }),
    });
    if (!res.ok) {
      showToast(t("err.user.delete"), "error");
      return;
    }
    setUsers((prev) => prev.filter((x) => x.username !== userEditing));
    showToast(t("ok.user.deleted"), "success");
    resetForm();
  }, [userEditing, t, showToast, setUsers, resetForm]);

  const selectUser = useCallback((u: User) => {
    setUserEditing(u.username);
    setUserUsername(u.username);
    setUserPassword("");
    setPasswordStrength("empty");
    setUserRole(u.role);
    setUserActive(u.active);
    const p = u.permissions || {};
    setPermViewTimer(!!p.canViewTimer);
    setPermControlTimer(!!p.canControlTimer);
    setPermTogglePower(!!p.canTogglePower);
    setPermSetTemperature(!!p.canSetTemperature);
    setPermAddPackage(!!p.canAddPackage);
    setPermManageUsers(!!p.canManageUsers);
    setPermViewLogs(!!p.canViewLogs);
    setPermViewChillers(!!p.canViewChillers);
    setPermViewPdgs(!!p.canViewPdgs);
    setPermViewUserActivity(!!p.canViewUserActivity);
    setPermChangeLanguage(!!p.canChangeLanguage);
  }, []);

  if (!isOpen) return null;

  const inputClass = theme === "dark"
    ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
    : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
      <div
        className={
          theme === "dark"
            ? "w-full sm:max-w-2xl max-w-[96vw] rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl max-h-[85vh] overflow-auto"
            : "w-full sm:max-w-2xl max-w-[96vw] rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl max-h-[85vh] overflow-auto"
        }
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t("admin.users.manage")}</h3>
          <button
            type="button"
            onClick={onClose}
            className={
              theme === "dark"
                ? "rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                : "rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* Form Column */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400">{t("login.username")}</label>
            <input
              className={inputClass}
              value={userUsername}
              onChange={(e) => setUserUsername(e.target.value)}
              placeholder={t("user.username.placeholder")}
            />
            <label className="text-xs text-slate-400">{t("password")}</label>
            <input
              type="password"
              className={inputClass}
              value={userPassword}
              onChange={(e) => {
                setUserPassword(e.target.value);
                evaluatePasswordStrength(e.target.value);
              }}
              placeholder={t("password")}
            />
            <div className="flex items-center gap-2 text-[11px]">
              <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                {passwordStrength === "empty"
                  ? t("password.empty")
                  : passwordStrength === "weak"
                    ? t("password.weak")
                    : passwordStrength === "medium"
                      ? t("password.medium")
                      : t("password.strong")}
              </span>
              <div className="flex-1 h-1 rounded-full overflow-hidden">
                <div
                  className={
                    passwordStrength === "empty"
                      ? "w-0 h-full"
                      : passwordStrength === "weak"
                        ? "w-1/3 h-full bg-red-500"
                        : passwordStrength === "medium"
                          ? "w-2/3 h-full bg-amber-500"
                          : "w-full h-full bg-emerald-500"
                  }
                />
              </div>
            </div>
            <label className="text-xs text-slate-400">{t("role.label")}</label>
            <select
              className={inputClass}
              value={userRole}
              onChange={(e) => {
                const v = e.target.value === "admin" ? "admin" : e.target.value === "manager" ? "manager" : "viewer";
                setUserRole(v);
                applyRolePreset(v);
              }}
            >
              <option value="viewer">{t("role.viewer")}</option>
              <option value="manager">{t("role.manager")}</option>
              <option value="admin">{t("role.admin")}</option>
            </select>
            <button
              type="button"
              onClick={() => applyRolePreset(userRole)}
              className={
                theme === "dark"
                  ? "rounded-lg border border-slate-600 bg-slate-900 px-3 py-1 text-xs text-slate-100"
                  : "rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800"
              }
            >
              {t("apply.role.preset")}
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <span>{t("status.active")}</span>
              <input type="checkbox" checked={userActive} onChange={(e) => setUserActive(e.target.checked)} />
            </label>

            {/* Permissions */}
            <div className="mt-2 text-xs font-semibold">{t("permissions.title")}</div>
            {[
              { checked: permViewTimer, onChange: setPermViewTimer, label: "perm.viewTimer" },
              { checked: permControlTimer, onChange: setPermControlTimer, label: "perm.controlTimer" },
              { checked: permChangeLanguage, onChange: setPermChangeLanguage, label: "perm.changeLanguage" },
              { checked: permTogglePower, onChange: setPermTogglePower, label: "perm.togglePower" },
              { checked: permSetTemperature, onChange: setPermSetTemperature, label: "perm.setTemperature" },
              { checked: permViewChillers, onChange: setPermViewChillers, label: "perm.viewChillers" },
              { checked: permViewPdgs, onChange: setPermViewPdgs, label: "perm.viewPdgs" },
              { checked: permViewUserActivity, onChange: setPermViewUserActivity, label: "perm.viewUserActivity" },
              { checked: permAddPackage, onChange: setPermAddPackage, label: "perm.addPackage" },
              { checked: permManageUsers, onChange: setPermManageUsers, label: "perm.manageUsers" },
              { checked: permViewLogs, onChange: setPermViewLogs, label: "perm.viewLogs" },
            ].map((perm) => (
              <label key={perm.label} className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={perm.checked}
                  onChange={(e) => perm.onChange(e.target.checked)}
                />
                <span>{t(perm.label)}</span>
              </label>
            ))}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveUser}
                className={
                  theme === "dark"
                    ? "flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                    : "flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                }
                disabled={savingUser}
              >
                {savingUser ? t("admin.users.saving") : userEditing ? t("admin.users.save") : t("admin.users.add")}
              </button>
              {userEditing && (
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  className={
                    theme === "dark"
                      ? "rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                      : "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  }
                >
                  {t("action.user.delete")}
                </button>
              )}
              <button
                type="button"
                onClick={resetForm}
                className={
                  theme === "dark"
                    ? "rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                    : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                }
              >
                {t("reset")}
              </button>
            </div>
            {formError && <p className="text-xs text-red-500">{formError}</p>}
          </div>

          {/* Users List Column */}
          <div className="flex flex-col gap-2">
            <input
              className={inputClass}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={t("user.search.placeholder")}
            />
            <ul className="space-y-2 max-h-[50vh] overflow-auto">
              {filteredUsers.map((u) => (
                <li
                  key={u.username}
                  onClick={() => selectUser(u)}
                  className={`cursor-pointer rounded-xl px-3 py-2 text-sm ${
                    theme === "dark"
                      ? `border border-slate-800 ${userEditing === u.username ? "bg-blue-900/30" : "bg-slate-950 hover:bg-slate-900"}`
                      : `border border-slate-200 ${userEditing === u.username ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{u.username}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        u.active
                          ? theme === "dark"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-emerald-100 text-emerald-700"
                          : theme === "dark"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {u.active ? t("status.active") : t("status.inactive")}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{t(`role.${u.role}`)}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
