"use client";

import { useEffect, useMemo, useState } from "react";
import { WithAccess } from "../_components/rbac";
import { useI18n } from "@/app/_components/i18n";
import { AdminChillerStats } from "@/app/admin/_components/AdminChillerStats";
import { AdminAddChillerSection } from "@/app/admin/_components/AdminAddChillerSection";
import fanapLogo from "../../../fanap.png";
import Image from "next/image";
import { AdminPdgPanel } from "@/app/admin/_components/AdminPdgPanel";
import { ChillerCard } from "@/app/admin/_components/ChillerCard";
import { LanguageSwitcher } from "@/app/_components/LanguageSwitcher";
import { LogsPanel } from "./_components/LogsPanel";
import { AdminTabsModal } from "@/app/admin/_components/AdminTabsModal";
import { TabItem } from "@/lib/db";

type Chiller = {
  id: string;
  name: string;
  ip: string;
  active: boolean;
};

type PowerLog = {
  id: string;
  unitName: string;
  action: "on" | "off";
  at: string;
  user?: string;
};

type PdgItem = {
  id: string;
  name: string;
  ip: string;
  active: boolean;
  url: string;
};

type ActivityLog = {
  id: string;
  username: string;
  action: string;
  at: string;
  details?: Record<string, unknown>;
};
type Role = "admin" | "manager" | "viewer" | "guest";

export default function AdminPage() {
  const [chillers, setChillers] = useState<Chiller[]>([]);
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [active, setActive] = useState(true);
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [logs, setLogs] = useState<PowerLog[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [role, setRole] = useState<Role>("guest");
  const [pdgModalOpen, setPdgModalOpen] = useState(false);
  const [pdgName, setPdgName] = useState("");
  const [pdgIp, setPdgIp] = useState("");
  const [users, setUsers] = useState<
    Array<{ username: string; role: "admin" | "manager" | "viewer"; active: boolean; permissions?: Record<string, boolean> }>
  >([]);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [userEditing, setUserEditing] = useState<string | null>(null);
  const [userUsername, setUserUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "manager" | "viewer">("viewer");
  const [userActive, setUserActive] = useState(true);
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
  const [progressOnSeconds, setProgressOnSeconds] = useState(60);
  const [progressOffSeconds, setProgressOffSeconds] = useState(60);
  const [progressByChiller, setProgressByChiller] = useState<Record<string, { progressOnSeconds: number; progressOffSeconds: number }>>({});
  const [mePermissions, setMePermissions] = useState<Record<string, boolean> | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<"empty" | "weak" | "medium" | "strong">("empty");
  const [formError, setFormError] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityUserFilter, setActivityUserFilter] = useState("");
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLimit, setActivityLimit] = useState(50);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [manageTabsModalOpen, setManageTabsModalOpen] = useState(false); // New state for tabs modal
  const { t } = useI18n();
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
      return "light";
    }
    return "dark";
  });

  useEffect(() => {
    const value = theme === "dark" ? "dark" : "light";
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", value);
    }
  }, [theme]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        const r0 = j && typeof j.role === "string" ? j.role : "guest";
        const rr: Role =
          r0 === "admin" || r0 === "manager" || r0 === "viewer"
            ? r0
            : "guest";
        setRole(rr);
        if (j && j.permissions && typeof j.permissions === "object") {
          setMePermissions(j.permissions as Record<string, boolean>);
        } else {
          setMePermissions(null);
        }
        if (rr === "guest") {
          location.href = "/login";
        } else if (rr === "viewer") {
          location.href = "/dashboard";
        }
      })
      .catch(() => {
        setRole("guest");
        location.href = "/login";
      });

    import("@/lib/services/chillers")
      .then((m) => m.fetchChillers())
      .then((items) => setChillers(items))
      .catch(() => {
        setMsg(t("err.list.fetch"));
        setToast({ message: t("err.chillers.fetch"), type: "error" });
        setToastVisible(true);
        setTimeout(() => {
          setToastVisible(false);
        }, 4000);
      });
  }, []);

  useEffect(() => {
    setActivityLoading(true);
    const q = activityUserFilter.trim().length
      ? `/api/activity-log?username=${encodeURIComponent(activityUserFilter)}&limit=${activityLimit}`
      : `/api/activity-log?limit=${activityLimit}`;
    fetch(q)
      .then((r) => r.json())
      .then((j) => setActivityLogs(Array.isArray(j.items) ? j.items : []))
      .catch(() => undefined)
      .finally(() => setActivityLoading(false));
  }, [activityUserFilter, activityLimit]);

  useEffect(() => {
    if (!Array.isArray(chillers) || chillers.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        chillers.map(async (c) => {
          try {
            const m = await import("@/lib/services/settings");
            const item = await m.getSettingsForChiller(c.id);
            if (!item) return [c.id, null] as const;
            return [
              c.id,
              {
                progressOnSeconds: Math.max(1, Math.round(item.progressOnSeconds)),
                progressOffSeconds: Math.max(1, Math.round(item.progressOffSeconds)),
              },
            ] as const;
          } catch {
            return [c.id, null] as const;
          }
        }),
      );
      if (cancelled) return;
      const next: Record<string, { progressOnSeconds: number; progressOffSeconds: number }> = {};
      for (const [id, val] of entries) {
        if (val) next[id] = val;
      }
      setProgressByChiller(next);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [chillers]);

  useEffect(() => {
    if (!(mePermissions && mePermissions.canViewLogs)) return;
    import("@/lib/services/powerLog")
      .then((m) => m.fetchPowerLog())
      .then((items) => setLogs(items))
      .catch(() => undefined);
    const id = setInterval(() => {
      import("@/lib/services/powerLog")
        .then((m) => m.fetchPowerLog())
        .then((items) => setLogs(items))
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(id);
  }, [mePermissions]);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!(role === "manager" || role === "admin")) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((j) => setUsers(Array.isArray(j.items) ? j.items : []))
      .catch(() => undefined);
  }, [role]);

  useEffect(() => {
    if (!(role === "manager" || role === "admin")) return;
    fetch("/api/activity-log")
      .then((r) => r.json())
      .then((j) => setActivityLogs(Array.isArray(j.items) ? j.items : []))
      .catch(() => undefined);
  }, [role]);
  useEffect(() => {
    import("@/lib/services/settings")
      .then((m) => m.getGlobalSettings())
      .then((item) => {
        setProgressOnSeconds(item.progressOnSeconds);
        setProgressOffSeconds(item.progressOffSeconds);
      })
      .catch(() => undefined);
  }, []);

  type PowerSession = {
    id: string;
    unitName: string;
    state: "on" | "off";
    startAt: string;
    endAt?: string;
    durationMs: number;
  };

  const powerSessions = useMemo(() => {
    if (!logs.length) return [] as PowerSession[];
    const asc = [...logs].slice().reverse();
    const grouped = new Map<string, PowerLog[]>();
    for (const log of asc) {
      const key = log.unitName || "";
      const arr = grouped.get(key) || [];
      arr.push(log);
      grouped.set(key, arr);
    }
    const sessions: PowerSession[] = [];
    for (const [unitName, arr] of grouped) {
      for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        const prev = i > 0 ? arr[i - 1] : undefined;
        if (prev) {
          if (prev.action === "on" && current.action === "off") {
            const startMs = new Date(prev.at).getTime();
            const endMs = new Date(current.at).getTime();
            const diff = endMs - startMs;
            if (diff > 0) {
              sessions.push({
                id: `${unitName}-${prev.id}-${current.id}-on`,
                unitName,
                state: "on",
                startAt: prev.at,
                endAt: current.at,
                durationMs: diff,
              });
            }
          }
          if (prev.action === "off" && current.action === "on") {
            const startMs = new Date(prev.at).getTime();
            const endMs = new Date(current.at).getTime();
            const diff = endMs - startMs;
            if (diff > 0) {
              sessions.push({
                id: `${unitName}-${prev.id}-${current.id}-off`,
                unitName,
                state: "off",
                startAt: prev.at,
                endAt: current.at,
                durationMs: diff,
              });
            }
          }
        }
      }
      const last = arr[arr.length - 1];
      const startMs = new Date(last.at).getTime();
      const endMs = now;
      const diff = endMs - startMs;
      if (diff > 0) {
        sessions.push({
          id: `${unitName}-${last.id}-open-${last.action}`,
          unitName,
          state: last.action,
          startAt: last.at,
          endAt: undefined,
          durationMs: diff,
        });
      }
    }
    sessions.sort(
      (a, b) =>
        new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    );
    return sessions;
  }, [logs, now]);

 

  const canEditChillers =
    role === "admin" ||
    !!(mePermissions && mePermissions.canAddPackage);
  

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  const applyRolePreset = (r: "admin" | "manager" | "viewer") => {
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
  };

  const evaluatePasswordStrength = (s: string) => {
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
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const t1 = (u.username || "").toLowerCase();
      const t2 = (u.role || "").toLowerCase();
      return t1.includes(q) || t2.includes(q);
    });
  }, [users, userSearch]);

  const reload = () => {
    import("@/lib/services/chillers")
      .then((m) => m.fetchChillers())
      .then((items) => setChillers(items))
      .catch(() => {
        setMsg(t("err.list.fetch"));
        showToast(t("err.chillers.fetch"), "error");
      });
  };

  const handleAdd = async () => {
    if (!canEditChillers) {
      showToast(t("no.access.addChiller"), "error");
      return;
    }
    setMsg(t("loading.adding"));
    const m = await import("@/lib/services/chillers");
    const item = await m.addChiller({ name, ip, active });
    if (!item) {
      setMsg(t("err.addChiller"));
      showToast(t("err.addChiller"), "error");
      return;
    }
    setChillers((prev) => [...prev, item]);
    setName("");
    setIp("");
    setActive(true);
    setMsg(t("ok.chiller.added"));
    showToast(t("ok.chiller.added"), "success");
    try {
      const m2 = await import("@/lib/services/settings");
      const res2 = await m2.updateChillerSettings({
        chillerId: item.id,
        progressOnSeconds: Math.max(1, Math.round(progressOnSeconds)),
        progressOffSeconds: Math.max(1, Math.round(progressOffSeconds)),
      });
      if (res2) {
        if (typeof res2.progressOnSeconds === "number" && typeof res2.progressOffSeconds === "number") {
          setProgressByChiller((prev) => ({
            ...prev,
            [item.id]: {
              progressOnSeconds: res2.progressOnSeconds,
              progressOffSeconds: res2.progressOffSeconds,
            },
          }));
        }
      }
    } catch {
    }
  };

  const handleSave = async (c: Chiller) => {
    if (!canEditChillers) {
      showToast(t("no.access.editChiller"), "error");
      return;
    }
    setMsg(t("loading.saving"));
    const m = await import("@/lib/services/chillers");
    const ok = await m.updateChiller(c.id, { name: c.name, ip: c.ip, active: c.active });
    if (!ok) {
      setMsg(t("err.saveChiller"));
      showToast(t("err.saveChiller"), "error");
      return;
    }
    setMsg(t("ok.chiller.saved"));
    showToast(t("ok.chiller.saved"), "success");
  };

  const handleSaveProgressForChiller = async (c: Chiller) => {
    if (!canEditChillers) {
      showToast(t("no.access.editChillerSettings"), "error");
      return;
    }
    const cur = progressByChiller[c.id] || {
      progressOnSeconds,
      progressOffSeconds,
    };
    const m = await import("@/lib/services/settings");
    const res = await m.updateChillerSettings({
      chillerId: c.id,
      progressOnSeconds: Math.max(1, Math.round(cur.progressOnSeconds)),
      progressOffSeconds: Math.max(1, Math.round(cur.progressOffSeconds)),
    });
    if (!res) {
      showToast(t("err.progress.save"), "error");
      return;
    }
    const item = res;
    if (item && typeof item.progressOnSeconds === "number" && typeof item.progressOffSeconds === "number") {
      setProgressByChiller((prev) => ({
        ...prev,
        [c.id]: {
          progressOnSeconds: item.progressOnSeconds,
          progressOffSeconds: item.progressOffSeconds,
        },
      }));
      showToast(t("ok.progress.saved"), "success");
    } else {
      showToast(t("err.progress.invalidResponse"), "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEditChillers) {
      showToast(t("no.access.deleteChiller"), "error");
      return;
    }
    const m = await import("@/lib/services/chillers");
    const ok = await m.deleteChiller(id);
    if (!ok) {
      setMsg(t("err.deleteChiller"));
      showToast(t("err.deleteChiller"), "error");
      return;
    }
    setChillers((prev) => prev.filter((x) => x.id !== id));
    setMsg(t("ok.chiller.deleted"));
    showToast(t("ok.chiller.deleted"), "success");
  };

  const pdgs: PdgItem[] = chillers.map((c) => {
    const baseIp = (c.ip || "").trim().replace(/\/+$/, "");
    const url = `http://${baseIp}/pdg.index`;
    return {
      id: c.id,
      name: c.name,
      ip: baseIp,
      active: c.active,
      url,
    };
  });

  const handleOpenPdg = (item: PdgItem) => {
    if (!item.ip) return;
    const href = item.url;
    if (typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  const handleAddPdg = async () => {
    if (!canEditChillers) {
      showToast(t("no.access.addPdg"), "error");
      return;
    }
    if (!pdgName.trim() || !pdgIp.trim()) {
      showToast(t("err.pdg.input"), "error");
      return;
    }

    setMsg(t("loading.addingPdg"));
    const m = await import("@/lib/services/chillers");
    const item = await m.addChiller({ name: pdgName, ip: pdgIp, active: true });
    if (!item) {
      setMsg(t("err.addPdg"));
      showToast(t("err.addPdg"), "error");
      return;
    }
    setChillers((prev) => [...prev, item]);
    setPdgName("");
    setPdgIp("");
    setMsg(t("ok.pdg.added"));
    showToast(t("ok.pdg.added"), "success");
    try {
      const m2 = await import("@/lib/services/settings");
      const res2 = await m2.updateChillerSettings({
        chillerId: item.id,
        progressOnSeconds: Math.max(1, Math.round(progressOnSeconds)),
        progressOffSeconds: Math.max(1, Math.round(progressOffSeconds)),
      });
      if (res2) {
        if (typeof res2.progressOnSeconds === "number" && typeof res2.progressOffSeconds === "number") {
          setProgressByChiller((prev) => ({
            ...prev,
            [item.id]: {
              progressOnSeconds: res2.progressOnSeconds,
              progressOffSeconds: res2.progressOffSeconds,
            },
          }));
        }
      }
    } catch {
    }
  };

  const handleDeletePdg = async (id: string) => {
    if (!canEditChillers) {
      showToast(t("no.access.deletePdg"), "error");
      return;
    }

    const m = await import("@/lib/services/chillers");
    const ok = await m.deleteChiller(id);
    if (!ok) {
      setMsg(t("err.deletePdg"));
      showToast(t("err.deletePdg"), "error");
      return;
    }
    setChillers((prev) => prev.filter((x) => x.id !== id));
    setMsg(t("ok.pdg.deleted"));
    showToast(t("ok.pdg.deleted"), "success");
  };

  const handleDeactivateUser = async (u: { username: string; role: "admin" | "manager" | "viewer"; active: boolean }) => {
    if (!(role === "manager" || role === "admin")) {
      showToast(t("no.access.deactivateUser"), "error");
      return;
    }
    if (!u.active) return;
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u.username, active: false }),
    });
    if (!res.ok) {
      showToast(t("err.user.deactivate"), "error");
      return;
    }
    setUsers((prev) => prev.map((x) => (x.username === u.username ? { ...x, active: false } : x)));
    showToast(t("ok.user.deactivated"), "success");
  };

  return (
    <div
      className={
        theme === "dark"
          ? "min-h-screen bg-[#020617] text-slate-50"
          : "min-h-screen bg-[#f7f9fc] text-[#1f2937]"
      }
    >
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
              onClick={() => setUsersModalOpen(true)}
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
              onClick={() => setManageTabsModalOpen(true)}
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
            onClick={() =>
              setTheme((t) => (t === "dark" ? "light" : "dark"))
            }
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
              fetch("/api/auth/logout", { method: "POST" }).then(() => {
                location.href = "/login";
              });
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
      <main className="px-4 py-4 space-y-4">
        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <WithAccess
            anyRoles={["admin", "manager"]}
            loadingFallback={
              <div
                className={
                  theme === "dark"
                    ? "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 shadow animate-pulse"
                    : "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow animate-pulse"
                }
              >
                <div className="h-4 w-24 bg-slate-700 rounded mb-2" />
                <div className="h-6 w-16 bg-slate-700 rounded" />
              </div>
            }
          >
            <AdminChillerStats
              theme={theme}
              total={chillers.length}
              activeCount={chillers.filter((c) => c.active).length}
            />
          </WithAccess>
        </section>

        <div className="grid gap-4 lg:grid-cols-12">
          <WithAccess
            anyRoles={["admin"]}
            anyPerms={["canAddPackage"]}
            loadingFallback={
              <div
                className={
                  theme === "dark"
                    ? "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 shadow animate-pulse"
                    : "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow animate-pulse"
                }
              >
                <div className="h-4 w-36 bg-slate-700 rounded mb-2" />
                <div className="h-8 w-full bg-slate-700 rounded" />
              </div>
            }
          >
            <AdminAddChillerSection
              theme={theme}
              canEditChillers={canEditChillers}
              msg={msg}
              name={name}
              ip={ip}
              active={active}
              onChangeName={setName}
              onChangeIp={setIp}
              onChangeActive={setActive}
              onAdd={handleAdd}
              onReload={reload}
            />
          </WithAccess>

          <section className="lg:col-span-12 mt-4 grid gap-4 two-col-lg-grid">
            <WithAccess
              anyRoles={["admin", "manager"]}
              anyPerms={["canViewChillers"]}
              loadingFallback={
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className={
                        theme === "dark"
                          ? "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 shadow animate-pulse"
                          : "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow animate-pulse"
                      }
                    >
                      <div className="h-4 w-24 bg-slate-700 rounded mb-2" />
                      <div className="h-4 w-36 bg-slate-700 rounded" />
                    </div>
                  ))}
                </div>
              }
            >
              <div>
                <h4 className="mb-3 text-sm font-semibold">{t("chillers")}</h4>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {chillers.map((c) => (
                    <ChillerCard
                      key={c.id}
                      theme={theme}
                      chiller={c}
                      canEditChillers={canEditChillers}
                      progressDefaultOn={progressOnSeconds}
                      progressDefaultOff={progressOffSeconds}
                      progress={progressByChiller[c.id] || null}
                      onChangeChiller={(id, patch) =>
                        setChillers((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
                      }
                      onChangeProgress={(id, next) =>
                        setProgressByChiller((prev) => ({
                          ...prev,
                          [id]: {
                            progressOnSeconds: next.progressOnSeconds,
                            progressOffSeconds: next.progressOffSeconds,
                          },
                        }))
                      }
                      onSave={handleSave}
                      onDelete={handleDelete}
                      onSaveProgress={handleSaveProgressForChiller}
                    />
                  ))}
                </div>
              </div>
            </WithAccess>

            <WithAccess
              anyPerms={["canViewLogs"]}
              loadingFallback={
                <aside
                  className={
                    theme === "dark"
                      ? "rounded-2xl border border-slate-800 bg-slate-950 shadow-lg p-4 animate-pulse"
                      : "rounded-2xl border border-slate-200 bg-slate-100 shadow-lg p-4 animate-pulse"
                  }
                >
                  <div className="h-4 w-24 bg-slate-700 rounded mb-3" />
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 w-full bg-slate-700/60 rounded" />
                    ))}
                  </div>
                </aside>
              }
            >
              <LogsPanel theme={theme} sessions={powerSessions} now={now} />
            </WithAccess>
        </section>
        </div>
        <WithAccess anyRoles={["admin", "manager"]} anyPerms={["canViewPdgs"]}>
          <section
            className={
              theme === "dark"
                ? "mt-4 rounded-2xl border border-slate-800 bg-slate-950 shadow-xl px-4 py-4"
                : "mt-4 rounded-2xl border border-[#e6edf7] bg-[#fbfcff] shadow-xl px-4 py-4"
            }
          >
            <AdminPdgPanel
              theme={theme}
              pdgs={pdgs}
              canEditChillers={canEditChillers}
              onAddClick={() => setPdgModalOpen(true)}
              onOpenPdg={handleOpenPdg}
              onDeletePdg={handleDeletePdg}
            />
          </section>
        </WithAccess>
        <WithAccess anyRoles={["admin", "manager"]} anyPerms={["canViewUserActivity"]}>
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
                    onClick={() => {
                      setActivityLimit(2000);
                      setActivityModalOpen(true);
                    }}
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
              <>
              <ul className="space-y-2">
                {activityLogs.slice(0, 5).map((a) => {
                const atText = new Date(a.at).toLocaleString(
                  typeof document !== "undefined"
                    ? (document.documentElement.getAttribute("lang") === "en"
                        ? "en-US"
                        : document.documentElement.getAttribute("lang") === "ar"
                          ? "ar"
                          : "fa-IR")
                    : "fa-IR",
                );
                const title =
                  a.action === "user.create"
                    ? t("action.user.create")
                    : a.action === "user.update"
                      ? t("action.user.update")
                      : a.action === "user.deactivate"
                        ? t("action.user.deactivate")
                        : a.action === "user.delete"
                          ? t("action.user.delete")
                          : a.action === "auth.login"
                            ? t("action.auth.login")
                          : a.action === "chiller.create"
                            ? t("action.chiller.create")
                            : a.action === "chiller.update"
                              ? t("action.chiller.update")
                              : a.action === "chiller.delete"
                                ? t("action.chiller.delete")
                                : a.action === "settings.update_global"
                                  ? t("action.settings.update_global")
                                  : a.action === "settings.update_chiller"
                                    ? t("action.settings.update_chiller")
                                    : a.action;
                const d = a.details as Record<string, unknown> | undefined;
                const detailText =
                  d && typeof d.target === "string"
                    ? String(d.target)
                    : d && typeof d.name === "string"
                      ? String(d.name)
                      : "";
                return (
                  <li
                    key={a.id}
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
                      {t("admin.activity.by")} <span className="font-semibold">{a.username}</span>
                    </div>
                  </li>
                );
                })}
              </ul>
              </>
            )}
          </section>
        </WithAccess>
        {activityModalOpen && (
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
                  onClick={() => setActivityModalOpen(false)}
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
                  {activityLogs.map((a) => {
                  const atText = new Date(a.at).toLocaleString(
                    typeof document !== "undefined"
                      ? (document.documentElement.getAttribute("lang") === "en"
                          ? "en-US"
                          : document.documentElement.getAttribute("lang") === "ar"
                            ? "ar"
                            : "fa-IR")
                      : "fa-IR",
                  );
                  const title =
                    a.action === "user.create"
                      ? t("action.user.create")
                      : a.action === "user.update"
                        ? t("action.user.update")
                        : a.action === "user.deactivate"
                          ? t("action.user.deactivate")
                          : a.action === "user.delete"
                            ? t("action.user.delete")
                            : a.action === "auth.login"
                              ? t("action.auth.login")
                            : a.action === "chiller.create"
                              ? t("action.chiller.create")
                              : a.action === "chiller.update"
                                ? t("action.chiller.update")
                                : a.action === "chiller.delete"
                                  ? t("action.chiller.delete")
                                  : a.action === "settings.update_global"
                                    ? t("action.settings.update_global")
                                    : a.action === "settings.update_chiller"
                                      ? t("action.settings.update_chiller")
                                      : a.action;
                  const d = a.details as Record<string, unknown> | undefined;
                  const detailText =
                    d && typeof d.target === "string"
                      ? String(d.target)
                      : d && typeof d.name === "string"
                        ? String(d.name)
                        : "";
                  return (
                    <li
                      key={a.id}
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
                        {t("admin.activity.by")} <span className="font-semibold">{a.username}</span>
                      </div>
                    </li>
                  );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
        {toast && toastVisible && (
          <div
            className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-sm sm:text-base shadow-2xl z-50 max-w-[90%] sm:max-w-xl text-center ${
              toast.type === "success"
                ? theme === "dark"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-500 text-white"
                : theme === "dark"
                  ? "bg-red-600 text-white"
                  : "bg-red-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* مودال مدیریت PDG */}
        {pdgModalOpen && (
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
                  onClick={() => setPdgModalOpen(false)}
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
                    onClick={() => setPdgModalOpen(false)}
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
                    onClick={handleAddPdg}
                    disabled={!pdgName.trim() || !pdgIp.trim()}
                    className={
                      theme === "dark"
                        ? "flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        : "flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    }
                  >
                    {t("pdg.add")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {usersModalOpen && role === "manager" && (
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
                  onClick={() => setUsersModalOpen(false)}
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
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-400">{t("login.username")}</label>
                  <input
                    className={
                      theme === "dark"
                        ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    }
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    placeholder={t("user.username.placeholder")}
                  />
                  <label className="text-xs text-slate-400">{t("password")}</label>
                  <input
                    type="password"
                    className={
                      theme === "dark"
                        ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    }
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
                    className={
                      theme === "dark"
                        ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    }
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
                  <div className="mt-2 text-xs font-semibold">{t("permissions.title")}</div>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permViewTimer} onChange={(e) => setPermViewTimer(e.target.checked)} />
                    <span>{t("perm.viewTimer")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permControlTimer} onChange={(e) => setPermControlTimer(e.target.checked)} />
                    <span>{t("perm.controlTimer")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permChangeLanguage} onChange={(e) => setPermChangeLanguage(e.target.checked)} />
                    <span>{t("perm.changeLanguage")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permTogglePower} onChange={(e) => setPermTogglePower(e.target.checked)} />
                    <span>{t("perm.togglePower")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permSetTemperature} onChange={(e) => setPermSetTemperature(e.target.checked)} />
                    <span>{t("perm.setTemperature")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permViewChillers} onChange={(e) => setPermViewChillers(e.target.checked)} />
                    <span>{t("perm.viewChillers")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permViewPdgs} onChange={(e) => setPermViewPdgs(e.target.checked)} />
                    <span>{t("perm.viewPdgs")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={permViewUserActivity}
                      onChange={(e) => setPermViewUserActivity(e.target.checked)}
                    />
                    <span>{t("perm.viewUserActivity")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permAddPackage} onChange={(e) => setPermAddPackage(e.target.checked)} />
                    <span>{t("perm.addPackage")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permManageUsers} onChange={(e) => setPermManageUsers(e.target.checked)} />
                    <span>{t("perm.manageUsers")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permViewLogs} onChange={(e) => setPermViewLogs(e.target.checked)} />
                    <span>{t("perm.viewLogs")}</span>
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={async () => {
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
                      }}
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
                        onClick={async () => {
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
                          setUserEditing(null);
                          setUserUsername("");
                          setUserPassword("");
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
                        }}
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
                      onClick={() => {
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
                        setFormError(null);
                      }}
                      className={
                        theme === "dark"
                          ? "rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                          : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      }
                    >
                      {t("admin.users.add")}
                    </button>
                  </div>
                  {formError && (
                    <div className={theme === "dark" ? "text-xs text-red-400 mt-1" : "text-xs text-red-600 mt-1"}>
                      {formError}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-slate-400 mb-1">{t("users.title")}</div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder={t("users.search.placeholder")}
                      className={
                        theme === "dark"
                          ? "flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                          : "flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      }
                    />
                  </div>
                  <div className="max-h-[50vh] sm:max-h-[360px] overflow-auto rounded-xl border p-2">
                    <ul className="space-y-1 text-sm">
                      {filteredUsers.map((u) => (
                        <li key={u.username} className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setUserEditing(u.username);
                              setUserUsername(u.username);
                              setUserPassword("");
                              setPasswordStrength("empty");
                              setUserRole(u.role);
                              setUserActive(u.active);
                              setPermViewTimer(!!u.permissions?.canViewTimer);
                              setPermControlTimer(!!u.permissions?.canControlTimer);
                              setPermTogglePower(!!u.permissions?.canTogglePower);
                              setPermSetTemperature(!!u.permissions?.canSetTemperature);
                              setPermAddPackage(!!u.permissions?.canAddPackage);
                              setPermManageUsers(!!u.permissions?.canManageUsers);
                              setPermViewLogs(!!u.permissions?.canViewLogs);
                              setPermViewChillers(!!u.permissions?.canViewChillers);
                              setPermViewPdgs(!!u.permissions?.canViewPdgs);
                              setPermViewUserActivity(!!u.permissions?.canViewUserActivity);
                              setPermChangeLanguage(!!u.permissions?.canChangeLanguage);
                            }}
                            className={
                              theme === "dark"
                                ? "flex-1 text-left rounded-lg px-3 py-1.5 bg-slate-900 hover:bg-slate-800"
                                : "flex-1 text-left rounded-lg px-3 py-1.5 bg-slate-100 hover:bg-slate-200"
                            }
                          >
                            <div className="font-semibold">{u.username}</div>
                            <div className="text-[11px] text-slate-400">{t("role.label")}: {u.role === "admin" ? t("role.admin") : u.role === "manager" ? t("role.manager") : t("role.viewer")}</div>
                          </button>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                                u.active ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700/40 text-slate-300"
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-current" />
                              {u.active ? t("status.active") : t("status.inactive")}
                            </span>
                            {u.active ? (
                              <button
                                type="button"
                                onClick={() => handleDeactivateUser(u)}
                                className={
                                  theme === "dark"
                                    ? "rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                                    : "rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                }
                              >
                                {t("status.inactive")}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  const res = await fetch("/api/users", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ username: u.username, active: true }),
                                  });
                                if (res.ok) {
                                    setUsers((prev) => prev.map((x) => (x.username === u.username ? { ...x, active: true } : x)));
                                    showToast(t("ok.user.activated"), "success");
                                  } else {
                                    showToast(t("err.user.activate"), "error");
                                  }
                                }}
                                className={
                                  theme === "dark"
                                    ? "rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                    : "rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                }
                              >
                                {t("status.active")}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={async () => {
                              if (!confirm(t("user.confirm.delete"))) return;
                                const res = await fetch("/api/users", {
                                  method: "DELETE",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ username: u.username }),
                                });
                                if (res.ok) {
                                  setUsers((prev) => prev.filter((x) => x.username !== u.username));
                                  showToast(t("ok.user.deleted"), "success");
                                } else {
                                  showToast(t("err.user.delete"), "error");
                                }
                              }}
                              className={
                                theme === "dark"
                                  ? "rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                                  : "rounded-lg bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-300"
                              }
                            >
                              {t("delete")}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      {manageTabsModalOpen && <AdminTabsModal isOpen={manageTabsModalOpen} onClose={() => setManageTabsModalOpen(false)} />}
    </div>
  );
}
