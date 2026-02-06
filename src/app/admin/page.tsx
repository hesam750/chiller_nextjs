"use client";

import { useEffect, useMemo, useState } from "react";
import { WithAccess } from "@/app/_components/rbac";
import { AdminChillerStats } from "@/app/admin/_components/AdminChillerStats";
import { AdminAddChillerSection } from "@/app/admin/_components/AdminAddChillerSection";
import fanapLogo from "../../../fanap.png";
import Image from "next/image";
import { LogsPanel } from "@/app/admin/_components/LogsPanel";
import { AdminPdgPanel } from "@/app/admin/_components/AdminPdgPanel";
import { ChillerCard } from "@/app/admin/_components/ChillerCard";

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
        setMsg("خطا در دریافت لیست");
        setToast({ message: "خطا در دریافت لیست پکیج‌ها", type: "error" });
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
        setMsg("خطا در دریافت لیست");
        showToast("خطا در دریافت لیست پکیج‌ها", "error");
      });
  };

  const handleAdd = async () => {
    if (!canEditChillers) {
      showToast("شما دسترسی افزودن پکیج را ندارید", "error");
      return;
    }
    setMsg("در حال افزودن...");
    const m = await import("@/lib/services/chillers");
    const item = await m.addChiller({ name, ip, active });
    if (!item) {
      setMsg("خطا در افزودن");
      showToast("خطا در افزودن پکیج", "error");
      return;
    }
    setChillers((prev) => [...prev, item]);
    setName("");
    setIp("");
    setActive(true);
    setMsg("افزوده شد");
    showToast("پکیج با موفقیت افزوده شد", "success");
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
      showToast("شما دسترسی ویرایش پکیج را ندارید", "error");
      return;
    }
    setMsg("در حال ذخیره...");
    const m = await import("@/lib/services/chillers");
    const ok = await m.updateChiller(c.id, { name: c.name, ip: c.ip, active: c.active });
    if (!ok) {
      setMsg("خطا در ذخیره");
      showToast("خطا در ذخیره تغییرات پکیج", "error");
      return;
    }
    setMsg("ذخیره شد");
    showToast("تغییرات پکیج با موفقیت ذخیره شد", "success");
  };

  const handleSaveProgressForChiller = async (c: Chiller) => {
    if (!canEditChillers) {
      showToast("شما دسترسی ویرایش تنظیمات پکیج را ندارید", "error");
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
      showToast("خطا در ذخیره زمان پروگرس این پکیج", "error");
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
      showToast("زمان پروگرس این پکیج ذخیره شد", "success");
    } else {
      showToast("پاسخ نامعتبر از سرور برای ذخیره زمان پروگرس", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEditChillers) {
      showToast("شما دسترسی حذف پکیج را ندارید", "error");
      return;
    }
    const m = await import("@/lib/services/chillers");
    const ok = await m.deleteChiller(id);
    if (!ok) {
      setMsg("خطا در حذف");
      showToast("خطا در حذف پکیج", "error");
      return;
    }
    setChillers((prev) => prev.filter((x) => x.id !== id));
    setMsg("حذف شد");
    showToast("پکیج با موفقیت حذف شد", "success");
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
      showToast("شما دسترسی افزودن PDG را ندارید", "error");
      return;
    }
    if (!pdgName.trim() || !pdgIp.trim()) {
      showToast("لطفاً نام و آدرس IP را وارد کنید", "error");
      return;
    }

    setMsg("در حال افزودن PDG...");
    const m = await import("@/lib/services/chillers");
    const item = await m.addChiller({ name: pdgName, ip: pdgIp, active: true });
    if (!item) {
      setMsg("خطا در افزودن PDG");
      showToast("خطا در افزودن PDG", "error");
      return;
    }
    setChillers((prev) => [...prev, item]);
    setPdgName("");
    setPdgIp("");
    setMsg("PDG افزوده شد");
    showToast("PDG با موفقیت افزوده شد", "success");
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
      showToast("شما دسترسی حذف PDG را ندارید", "error");
      return;
    }

    const m = await import("@/lib/services/chillers");
    const ok = await m.deleteChiller(id);
    if (!ok) {
      setMsg("خطا در حذف PDG");
      showToast("خطا در حذف PDG", "error");
      return;
    }
    setChillers((prev) => prev.filter((x) => x.id !== id));
    setMsg("PDG حذف شد");
    showToast("PDG با موفقیت حذف شد", "success");
  };

  const handleDeactivateUser = async (u: { username: string; role: "admin" | "manager" | "viewer"; active: boolean }) => {
    if (!(role === "manager" || role === "admin")) {
      showToast("شما دسترسی غیرفعال‌سازی کاربران را ندارید", "error");
      return;
    }
    if (!u.active) return;
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u.username, active: false }),
    });
    if (!res.ok) {
      showToast("خطا در غیرفعال‌سازی کاربر", "error");
      return;
    }
    setUsers((prev) => prev.map((x) => (x.username === u.username ? { ...x, active: false } : x)));
    showToast("اکانت غیرفعال شد", "success");
  };

  return (
    <div
      className={
        theme === "dark"
          ? "min-h-screen bg-[#020617] text-slate-50"
          : "min-h-screen bg-slate-100 text-slate-900"
      }
    >
      <header
        className={
          theme === "dark"
            ? "flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950"
            : "flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white"
        }
      >
        <div className="flex items-center gap-2">
          <Image src={fanapLogo} alt="Fanap" className="h-6 w-auto" />
          <strong className="text-sm">پنل ادمین</strong>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/dashboard"
            className={
              theme === "dark"
                ? "rounded-lg border border-slate-600 bg-slate-900 px-3 py-1 text-xs text-slate-100"
                : "rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800 hover:bg-slate-50"
            }
          >
            داشبورد
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
              مدیریت پیشرفته کاربران
            </button>
          )}
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
            تم: {theme === "dark" ? "تاریک" : "روشن"}
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
              خروج
            </button>
          </form>
        </div>
      </header>
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

          <section className="lg:col-span-12 mt-4 grid gap-4 lg:grid-cols-[2fr,1fr]">
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
                <h4 className="mb-3 text-sm font-semibold">پکیج‌ها</h4>
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
                : "mt-4 rounded-2xl border border-slate-200 bg-white shadow-xl px-4 py-4"
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
                : "mt-4 rounded-2xl border border-slate-200 bg-white shadow-xl px-4 py-4"
            }
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h2 className="text-sm font-semibold">آخرین فعالیت کاربران</h2>
              <div className="flex items-center gap-2">
                <input
                  value={activityUserFilter}
                  onChange={(e) => {
                    setActivityUserFilter(e.target.value);
                    setActivityLimit(50);
                  }}
                  placeholder="فیلتر نام کاربری"
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
                    setActivityLimit(50);
                  }}
                  className={
                    theme === "dark"
                      ? "rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
                      : "rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800"
                  }
                >
                  حذف فیلتر
                </button>
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
                {activityLoading ? "در حال بارگذاری..." : "لاگی ثبت نشده است."}
              </div>
            ) : (
              <>
              <ul className="space-y-2">
                {activityLogs.map((a) => {
                const atText = new Date(a.at).toLocaleString("fa-IR");
                const title =
                  a.action === "user.create"
                    ? "ایجاد کاربر"
                    : a.action === "user.update"
                      ? "بروزرسانی کاربر"
                      : a.action === "user.deactivate"
                        ? "غیرفعال‌سازی کاربر"
                        : a.action === "user.delete"
                          ? "حذف کاربر"
                          : a.action === "auth.login"
                            ? "ورود کاربران"
                          : a.action === "chiller.create"
                            ? "ایجاد پکیج"
                            : a.action === "chiller.update"
                              ? "بروزرسانی پکیج"
                              : a.action === "chiller.delete"
                                ? "حذف پکیج"
                                : a.action === "settings.update_global"
                                  ? "ویرایش تنظیمات عمومی"
                                  : a.action === "settings.update_chiller"
                                    ? "ویرایش تنظیمات پکیج"
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
                      توسط <span className="font-semibold">{a.username}</span>
                    </div>
                  </li>
                );
                })}
              </ul>
              <div className="mt-3 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setActivityLimit((n) => Math.min(2000, n + 50))}
                  disabled={activityLoading}
                  className={
                    theme === "dark"
                      ? "rounded-lg border border-slate-600 bg-slate-900 px-3 py-1 text-xs text-slate-100 disabled:opacity-50"
                      : "rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800 disabled:opacity-50"
                  }
                >
                  نمایش بیشتر
                </button>
              </div>
              </>
            )}
          </section>
        </WithAccess>
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
                <h3 className="text-lg font-semibold">مدیریت PDG</h3>
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
                  <label className="text-sm font-medium text-slate-400 mb-2 block">
                    نام PDG
                  </label>
                  <input
                    type="text"
                    value={pdgName}
                    onChange={(e) => setPdgName(e.target.value)}
                    placeholder="مثلاً PDG 1"
                    className={
                      theme === "dark"
                        ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">
                    آدرس IP
                  </label>
                  <input
                    type="text"
                    value={pdgIp}
                    onChange={(e) => setPdgIp(e.target.value)}
                    placeholder="مثلاً 192.168.1.10"
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
                    انصراف
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
                    افزودن PDG
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {usersModalOpen && role === "manager" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
              className={
                theme === "dark"
                  ? "w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl"
                  : "w-full max-w-2xl rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl"
              }
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">مدیریت پیشرفته کاربران</h3>
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
              <div className="grid gap-4 grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-400">نام کاربری</label>
                  <input
                    className={
                      theme === "dark"
                        ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    }
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    placeholder="مثلاً user1"
                  />
                  <label className="text-xs text-slate-400">رمز عبور</label>
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
                    placeholder="رمز عبور"
                  />
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                      {passwordStrength === "empty"
                        ? "رمز عبور وارد نشده"
                        : passwordStrength === "weak"
                          ? "ضعیف"
                          : passwordStrength === "medium"
                            ? "متوسط"
                            : "قوی"}
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
                  <label className="text-xs text-slate-400">نقش</label>
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
                    <option value="viewer">بیننده</option>
                    <option value="manager">مدیر</option>
                    <option value="admin">ادمین</option>
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
                    اعمال پیش‌فرض نقش
                  </button>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <span>فعال</span>
                    <input type="checkbox" checked={userActive} onChange={(e) => setUserActive(e.target.checked)} />
                  </label>
                  <div className="mt-2 text-xs font-semibold">سطح دسترسی</div>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permViewTimer} onChange={(e) => setPermViewTimer(e.target.checked)} />
                    <span>مشاهده تایمر</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permControlTimer} onChange={(e) => setPermControlTimer(e.target.checked)} />
                    <span>تنظیم تایمر</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permTogglePower} onChange={(e) => setPermTogglePower(e.target.checked)} />
                    <span>خاموش/روشن</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permSetTemperature} onChange={(e) => setPermSetTemperature(e.target.checked)} />
                    <span>تنظیم دما</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permViewChillers} onChange={(e) => setPermViewChillers(e.target.checked)} />
                    <span>مشاهده لیست پکیج‌ها</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permViewPdgs} onChange={(e) => setPermViewPdgs(e.target.checked)} />
                    <span>مشاهده PDG ها</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={permViewUserActivity}
                      onChange={(e) => setPermViewUserActivity(e.target.checked)}
                    />
                    <span>آخرین فعالیت کاربران</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permAddPackage} onChange={(e) => setPermAddPackage(e.target.checked)} />
                    <span>افزودن پکیج + PDG</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permManageUsers} onChange={(e) => setPermManageUsers(e.target.checked)} />
                    <span>دسترسی به مدیریت کاربران</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={permViewLogs} onChange={(e) => setPermViewLogs(e.target.checked)} />
                    <span>دسترسی به لاگ‌ها</span>
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
                          },
                        };
                        if (!payload.username || !/^[\p{L}\p{N}._-]{3,}$/u.test(payload.username)) {
                          setFormError("نام کاربری باید حداقل ۳ کاراکتر و معتبر باشد");
                          showToast("نام کاربری نامعتبر است", "error");
                          return;
                        }
                        if (!userEditing) {
                          if (!payload.password || payload.password.length < 8) {
                            setFormError("رمز عبور باید حداقل ۸ کاراکتر باشد");
                            showToast("رمز عبور ضعیف است", "error");
                            return;
                          }
                        } else {
                          if (payload.password && payload.password.length < 8) {
                            setFormError("حداقل طول رمز برای تغییر باید ۸ کاراکتر باشد");
                            showToast("رمز عبور ضعیف است", "error");
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
                          showToast("خطا در ذخیره کاربر", "error");
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
                          showToast(userEditing ? "کاربر بروزرسانی شد" : "کاربر افزوده شد", "success");
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
                      {savingUser ? "در حال ذخیره..." : userEditing ? "ذخیره تغییرات" : "افزودن کاربر"}
                    </button>
                    {userEditing && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!userEditing) return;
                          if (!confirm("آیا از حذف این کاربر اطمینان دارید؟")) return;
                          const res = await fetch("/api/users", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ username: userEditing }),
                          });
                          if (!res.ok) {
                            showToast("خطا در حذف کاربر", "error");
                            return;
                          }
                          setUsers((prev) => prev.filter((x) => x.username !== userEditing));
                          showToast("کاربر حذف شد", "success");
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
                        حذف کاربر
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
                      ایجاد کاربر جدید
                    </button>
                  </div>
                  {formError && (
                    <div className={theme === "dark" ? "text-xs text-red-400 mt-1" : "text-xs text-red-600 mt-1"}>
                      {formError}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-slate-400 mb-1">کاربران</div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="جستجو کاربر یا نقش"
                      className={
                        theme === "dark"
                          ? "flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                          : "flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      }
                    />
                  </div>
                  <div className="max-h-[360px] overflow-auto rounded-xl border p-2">
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
                            }}
                            className={
                              theme === "dark"
                                ? "flex-1 text-left rounded-lg px-3 py-1.5 bg-slate-900 hover:bg-slate-800"
                                : "flex-1 text-left rounded-lg px-3 py-1.5 bg-slate-100 hover:bg-slate-200"
                            }
                          >
                            <div className="font-semibold">{u.username}</div>
                            <div className="text-[11px] text-slate-400">نقش: {u.role}</div>
                          </button>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                                u.active ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700/40 text-slate-300"
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-current" />
                              {u.active ? "فعال" : "غیرفعال"}
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
                                غیرفعال
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
                                    showToast("اکانت فعال شد", "success");
                                  } else {
                                    showToast("خطا در فعال‌سازی کاربر", "error");
                                  }
                                }}
                                className={
                                  theme === "dark"
                                    ? "rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                    : "rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                }
                              >
                                فعال
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm("آیا از حذف این کاربر اطمینان دارید؟")) return;
                                const res = await fetch("/api/users", {
                                  method: "DELETE",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ username: u.username }),
                                });
                                if (res.ok) {
                                  setUsers((prev) => prev.filter((x) => x.username !== u.username));
                                  showToast("کاربر حذف شد", "success");
                                } else {
                                  showToast("خطا در حذف کاربر", "error");
                                }
                              }}
                              className={
                                theme === "dark"
                                  ? "rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                                  : "rounded-lg bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-300"
                              }
                            >
                              حذف
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
    </div>
  );
}
