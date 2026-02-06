"use client";

import { useEffect, useMemo, useState } from "react";
import fanapLogo from "../../../fanap.png";

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
  const [progressOnSeconds, setProgressOnSeconds] = useState(60);
  const [progressOffSeconds, setProgressOffSeconds] = useState(60);
  const [progressByChiller, setProgressByChiller] = useState<Record<string, { progressOnSeconds: number; progressOffSeconds: number }>>({});
  const [mePermissions, setMePermissions] = useState<Record<string, boolean> | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<"empty" | "weak" | "medium" | "strong">("empty");
  const [formError, setFormError] = useState<string | null>(null);
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

    fetch("/api/chillers")
      .then((r) => r.json())
      .then((j) => setChillers(j.items || []))
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
    if (!Array.isArray(chillers) || chillers.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        chillers.map(async (c) => {
          try {
            const r = await fetch("/api/settings?chillerId=" + encodeURIComponent(c.id));
            if (!r.ok) return [c.id, null] as const;
            const j = await r.json().catch(() => null);
            const item = j && j.item ? j.item : null;
            if (!item || typeof item.progressOnSeconds !== "number" || typeof item.progressOffSeconds !== "number") {
              return [c.id, null] as const;
            }
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
    fetch("/api/power-log")
      .then((r) => r.json())
      .then((j) => setLogs(j.items || []))
      .catch(() => undefined);
    const id = setInterval(() => {
      fetch("/api/power-log")
        .then((r) => r.json())
        .then((j) => setLogs(j.items || []))
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
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        const item = j && j.item ? j.item : {};
        const onS = typeof item.progressOnSeconds === "number" ? item.progressOnSeconds : 60;
        const offS = typeof item.progressOffSeconds === "number" ? item.progressOffSeconds : 60;
        setProgressOnSeconds(Math.max(1, Math.round(onS)));
        setProgressOffSeconds(Math.max(1, Math.round(offS)));
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

  const formatDuration = (ms: number | undefined) => {
    if (!ms || ms <= 0) return "";
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];
    if (days > 0) {
      parts.push(`${days} روز`);
    }
    if (hours > 0) {
      parts.push(`${hours} ساعت`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} دقیقه`);
    }
    if (seconds > 0 && parts.length === 0) {
      parts.push(`${seconds} ثانیه`);
    }
    if (!parts.length) return "کمتر از یک ثانیه";
    return parts.join(" و ");
  };

  const canEditChillers =
    role === "admin" ||
    role === "manager" ||
    !!(mePermissions && mePermissions.canAddPackage);
  const canSeeChillersSection = role === "admin" || role === "manager";

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
    } else if (r === "manager") {
      setPermViewTimer(true);
      setPermControlTimer(true);
      setPermTogglePower(true);
      setPermSetTemperature(true);
      setPermAddPackage(false);
      setPermManageUsers(true);
      setPermViewLogs(true);
    } else {
      setPermViewTimer(true);
      setPermControlTimer(false);
      setPermTogglePower(false);
      setPermSetTemperature(false);
      setPermAddPackage(false);
      setPermManageUsers(false);
      setPermViewLogs(false);
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
    fetch("/api/chillers")
      .then((r) => r.json())
      .then((j) => setChillers(j.items || []))
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
    const res = await fetch("/api/chillers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ip, active }),
    });
    if (!res.ok) {
      setMsg("خطا در افزودن");
      showToast("خطا در افزودن پکیج", "error");
      return;
    }
    const data = await res.json();
    setChillers((prev) => [...prev, data.item]);
    setName("");
    setIp("");
    setActive(true);
    setMsg("افزوده شد");
    showToast("پکیج با موفقیت افزوده شد", "success");
    try {
      const r2 = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chillerId: data.item.id,
          progressOnSeconds: Math.max(1, Math.round(progressOnSeconds)),
          progressOffSeconds: Math.max(1, Math.round(progressOffSeconds)),
        }),
      });
      if (r2.ok) {
        const j2 = await r2.json().catch(() => null);
        const item2 = j2 && j2.item ? j2.item : null;
        if (item2 && typeof item2.progressOnSeconds === "number" && typeof item2.progressOffSeconds === "number") {
          setProgressByChiller((prev) => ({
            ...prev,
            [data.item.id]: {
              progressOnSeconds: item2.progressOnSeconds,
              progressOffSeconds: item2.progressOffSeconds,
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
    const res = await fetch("/api/chillers/" + encodeURIComponent(c.id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: c.name, ip: c.ip, active: c.active }),
    });
    if (!res.ok) {
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
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chillerId: c.id,
        progressOnSeconds: Math.max(1, Math.round(cur.progressOnSeconds)),
        progressOffSeconds: Math.max(1, Math.round(cur.progressOffSeconds)),
      }),
    });
    if (!res.ok) {
      showToast("خطا در ذخیره زمان پروگرس این پکیج", "error");
      return;
    }
    const j = await res.json().catch(() => null);
    const item = j && j.item ? j.item : null;
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
    const res = await fetch("/api/chillers/" + encodeURIComponent(id), {
      method: "DELETE",
    });
    if (!res.ok) {
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
    const res = await fetch("/api/chillers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: pdgName, ip: pdgIp, active: true }),
    });
    if (!res.ok) {
      setMsg("خطا در افزودن PDG");
      showToast("خطا در افزودن PDG", "error");
      return;
    }
    const data = await res.json();
    setChillers((prev) => [...prev, data.item]);
    setPdgName("");
    setPdgIp("");
    setPdgModalOpen(false);
    setMsg("PDG افزوده شد");
    showToast("PDG با موفقیت افزوده شد", "success");
    try {
      const r2 = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chillerId: data.item.id,
          progressOnSeconds: Math.max(1, Math.round(progressOnSeconds)),
          progressOffSeconds: Math.max(1, Math.round(progressOffSeconds)),
        }),
      });
      if (r2.ok) {
        const j2 = await r2.json().catch(() => null);
        const item2 = j2 && j2.item ? j2.item : null;
        if (item2 && typeof item2.progressOnSeconds === "number" && typeof item2.progressOffSeconds === "number") {
          setProgressByChiller((prev) => ({
            ...prev,
            [data.item.id]: {
              progressOnSeconds: item2.progressOnSeconds,
              progressOffSeconds: item2.progressOffSeconds,
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

    const res = await fetch("/api/chillers/" + encodeURIComponent(id), {
      method: "DELETE",
    });
    if (!res.ok) {
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
          <img src={fanapLogo.src} alt="Fanap" className="h-6 w-auto" />
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
          {canSeeChillersSection && (
            <>
              <div
                className={
                  theme === "dark"
                    ? "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 shadow"
                    : "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow"
                }
              >
                <div className="text-[11px] text-slate-400 mb-1">تعداد پکیج‌ها</div>
                <div className="text-2xl font-semibold">{chillers.length}</div>
              </div>
              <div
                className={
                  theme === "dark"
                    ? "rounded-2xl border border-emerald-600/70 bg-emerald-900/10 px-4 py-3 shadow"
                    : "rounded-2xl border border-emerald-500/40 bg-emerald-50 px-4 py-3 shadow"
                }
              >
                <div className="text-[11px] text-emerald-300 mb-1">پکیج‌های فعال</div>
                <div className="text-2xl font-semibold text-emerald-300">
                  {chillers.filter((c) => c.active).length}
                </div>
              </div>
            </>
          )}
          <div
            className={
              theme === "dark"
                ? "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 shadow"
                : "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow"
            }
          >
            <div className="text-[11px] text-slate-400 mb-1">آخرین رویداد</div>
            <div className="text-xs text-slate-300 ltr">
              {logs.length
                ? new Date(logs[0].at).toLocaleString("fa-IR")
                : "ثبت نشده"}
            </div>
          </div>
          <div
            className={
              theme === "dark"
                ? "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 shadow"
                : "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow"
            }
          >
            <div className="text-[11px] text-slate-400 mb-1">تعداد رویدادها</div>
            <div className="text-2xl font-semibold">{logs.length}</div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-12">
          {canSeeChillersSection && (
            <section
              className={
                theme === "dark"
                  ? "lg:col-span-12 rounded-2xl border border-slate-800 bg-slate-950 shadow-xl"
                  : "lg:col-span-12 rounded-2xl border border-slate-200 bg-white shadow-xl"
              }
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="text-sm font-semibold">افزودن پکیج</div>
              </div>
              <div className="px-4 py-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-[1.2fr,1.2fr,auto,auto] items-end">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      نام
                    </label>
                    <input
                      className={
                        theme === "dark"
                          ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                          : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      }
                      placeholder="مثلاً پکیج ۱"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      آدرس IP
                    </label>
                    <input
                      className={
                        theme === "dark"
                          ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm ltr text-left text-slate-100"
                          : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm ltr text-left text-slate-900"
                      }
                      placeholder="مثلاً 192.168.1.10"
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <span>فعال</span>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={!canEditChillers}
                      className={
                        theme === "dark"
                          ? "rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white"
                          : "rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      }
                    >
                      افزودن پکیج
                    </button>
                    <button
                      type="button"
                      onClick={reload}
                      className={
                        theme === "dark"
                          ? "rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                          : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 hover:bg-slate-50"
                      }
                    >
                      تازه‌سازی لیست
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-400 min-h-[20px]">{msg}</div>
              </div>
            </section>
          )}

          <section className="lg:col-span-12 mt-4 grid gap-4 lg:grid-cols-[2fr,1fr]">
            {canSeeChillersSection && (
              <div>
                <h4 className="mb-3 text-sm font-semibold">پکیج‌ها</h4>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {chillers.map((c) => (
                    <div
                      key={c.id}
                      className={
                        theme === "dark"
                          ? `rounded-2xl border bg-slate-950 px-4 py-3 shadow-lg ${
                              c.active
                                ? "border-emerald-500/40"
                                : "border-slate-800 opacity-80"
                            }`
                          : `rounded-2xl border bg-white px-4 py-3 shadow-lg ${
                              c.active
                                ? "border-emerald-500/40"
                                : "border-slate-200 opacity-80"
                            }`
                      }
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold text-sm">{c.name}</div>
                          <div className="text-[11px] text-slate-500 ltr">
                            {c.ip}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                            c.active
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-slate-700/40 text-slate-300"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-current" />
                          {c.active ? "فعال" : "غیرفعال"}
                        </span>
                      </div>
                      <div className="space-y-2 mt-2">
                        <input
                          className={
                            theme === "dark"
                              ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
                              : "w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                          }
                          value={c.name}
                          readOnly={!canEditChillers}
                          onChange={(e) =>
                            setChillers((prev) =>
                              prev.map((x) =>
                                x.id === c.id ? { ...x, name: e.target.value } : x
                              )
                            )
                          }
                        />
                        <input
                          className={
                            theme === "dark"
                              ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs ltr text-slate-100"
                              : "w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs ltr text-slate-900"
                          }
                          value={c.ip}
                          readOnly={!canEditChillers}
                          onChange={(e) =>
                            setChillers((prev) =>
                              prev.map((x) =>
                                x.id === c.id ? { ...x, ip: e.target.value } : x
                              )
                            )
                          }
                        />
                        <label className="flex items-center gap-2 text-xs text-slate-400">
                          <span>فعال</span>
                          <input
                            type="checkbox"
                            checked={c.active}
                            disabled={!canEditChillers}
                            onChange={(e) =>
                              setChillers((prev) =>
                                prev.map((x) =>
                                  x.id === c.id
                                    ? { ...x, active: e.target.checked }
                                    : x
                                )
                              )
                            }
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">زمان روشن شدن (ثانیه)</label>
                            <input
                              type="number"
                              min={1}
                              className={
                                theme === "dark"
                                  ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
                                  : "w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                              }
                              value={
                                (progressByChiller[c.id]?.progressOnSeconds ??
                                  progressOnSeconds)
                              }
                              readOnly={!canEditChillers}
                              onChange={(e) =>
                                setProgressByChiller((prev) => ({
                                  ...prev,
                                  [c.id]: {
                                    progressOnSeconds: Math.max(
                                      1,
                                      Math.round(Number(e.target.value) || 0),
                                    ),
                                    progressOffSeconds:
                                      prev[c.id]?.progressOffSeconds ??
                                      progressOffSeconds,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">زمان خاموش شدن (ثانیه)</label>
                            <input
                              type="number"
                              min={1}
                              className={
                                theme === "dark"
                                  ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
                                  : "w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                              }
                              value={
                                (progressByChiller[c.id]?.progressOffSeconds ??
                                  progressOffSeconds)
                              }
                              readOnly={!canEditChillers}
                              onChange={(e) =>
                                setProgressByChiller((prev) => ({
                                  ...prev,
                                  [c.id]: {
                                    progressOnSeconds:
                                      prev[c.id]?.progressOnSeconds ??
                                      progressOnSeconds,
                                    progressOffSeconds: Math.max(
                                      1,
                                      Math.round(Number(e.target.value) || 0),
                                    ),
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSave(c)}
                            disabled={!canEditChillers}
                            className="flex-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            ذخیره
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            disabled={!canEditChillers}
                            className="flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            حذف
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveProgressForChiller(c)}
                            disabled={!canEditChillers}
                            className="flex-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            ذخیره زمان پروگرس
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mePermissions && mePermissions.canViewLogs && (
            <aside
              className={
                theme === "dark"
                  ? "rounded-2xl border border-slate-800 bg-slate-950 shadow-lg p-4 flex flex-col gap-3 max-h-[460px]"
                  : "rounded-2xl border border-slate-200 bg-sky-50/80 shadow-lg p-4 flex flex-col gap-3 max-h-[460px]"
              }
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">لاگ خاموش/روشن</h2>
              </div>
              <div className="flex-1 overflow-auto">
                {logs.length === 0 ? (
                  <div
                    className={
                      theme === "dark"
                        ? "text-xs text-slate-400"
                        : "text-xs text-black"
                    }
                  >
                    هنوز لاگی ثبت نشده است.
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {powerSessions.map((session) => {
                      const durationText = formatDuration(session.durationMs);
                      const startDate = new Date(session.startAt);
                      const endDate = session.endAt
                        ? new Date(session.endAt)
                        : new Date(now);
                      const startDateText = startDate.toLocaleDateString("fa-IR");
                      const startTimeText = startDate.toLocaleTimeString("fa-IR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      });
                      const endDateText = endDate.toLocaleDateString("fa-IR");
                      const endTimeText = endDate.toLocaleTimeString("fa-IR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      });
                      return (
                        <li
                          key={session.id}
                          className={`rounded-xl px-3 py-2 border flex items-stretch justify-between gap-4 transition-colors ${
                            theme === "dark"
                              ? "bg-slate-900/80 border-slate-800"
                              : "bg-white border-slate-200 hover:border-sky-200/80 hover:bg-sky-50/60"
                          } ${
                            session.state === "on"
                              ? "shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                              : "shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
                          }`}
                        >
                          <div className="flex flex-col items-end gap-1 text-right min-w-[170px]">
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  session.state === "on"
                                    ? "inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.35)]"
                                    : "inline-flex h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.35)]"
                                }
                              />
                              <span className="text-sm font-semibold">
                                {session.unitName}
                              </span>
                            </div>
                            <div
                              className={`flex flex-col gap-0.5 text-xs ${
                                theme === "dark" ? "text-slate-400" : "text-black"
                              }`}
                            >
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-xs font-semibold">
                                  {session.state === "on" ? "روشن شد" : "خاموش شد"}
                                </span>
                                <div className="flex gap-1">
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                                      theme === "dark"
                                        ? "bg-slate-800/60 text-slate-100"
                                        : "bg-slate-200 text-slate-800"
                                    }`}
                                  >
                                    {startDateText}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                                      theme === "dark"
                                        ? "bg-slate-800/60 text-slate-100"
                                        : "bg-slate-200 text-slate-800"
                                    }`}
                                  >
                                    {startTimeText}
                                  </span>
                                </div>
                              </div>
                              {session.endAt && (
                                <div className="flex flex-col items-end gap-0.5 mt-1">
                                  <span className="text-xs font-semibold">
                                    {session.state === "on" ? "خاموش شد" : "روشن شد"}
                                  </span>
                                  <div className="flex gap-1">
                                    <span
                                      className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                                        theme === "dark"
                                          ? "bg-slate-800/60 text-slate-100"
                                          : "bg-slate-200 text-slate-800"
                                      }`}
                                    >
                                      {endDateText}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                                        theme === "dark"
                                          ? "bg-slate-800/60 text-slate-100"
                                          : "bg-slate-200 text-slate-800"
                                      }`}
                                    >
                                      {endTimeText}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {!session.endAt && (
                                <span
                                  className={
                                    theme === "dark"
                                      ? "mt-1 text-xs text-amber-400"
                                      : "mt-1 text-xs text-black"
                                  }
                                >
                                  {session.state === "on"
                                    ? "هنوز خاموش نشده (تایمر در حال شمارش)"
                                    : "هنوز روشن نشده (تایمر در حال شمارش)"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-1 text-sm">
                            <span
                              className={
                                session.state === "on"
                                  ? `inline-flex items-center rounded-full px-2 py-0.5 border ${
                                      theme === "dark"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                                        : "bg-emerald-50 text-black border-emerald-200"
                                    }`
                                  : `inline-flex items-center rounded-full px-2 py-0.5 border ${
                                      theme === "dark"
                                        ? "bg-red-500/10 text-red-400 border-red-500/40"
                                        : "bg-red-50 text-black border-red-200"
                                    }`
                              }
                            >
                              در این بازه{" "}
                              {session.state === "on" ? "روشن بوده" : "خاموش بوده"}
                            </span>
                            <div
                              className={`flex flex-wrap items-center gap-1 text-xs ${
                                theme === "dark" ? "text-slate-400" : "text-black"
                              }`}
                            >
                              <span>از</span>
                              <span
                                className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                                  theme === "dark"
                                    ? "bg-slate-800/40 text-slate-100"
                                    : "bg-slate-200 text-slate-800"
                                }`}
                              >
                                {startDateText}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                                  theme === "dark"
                                    ? "bg-slate-800/40 text-slate-100"
                                    : "bg-slate-200 text-slate-800"
                                }`}
                              >
                                {startTimeText}
                              </span>
                              <span>تا</span>
                              {session.endAt ? (
                                <>
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                                      theme === "dark"
                                        ? "bg-slate-800/40 text-slate-100"
                                        : "bg-slate-200 text-slate-800"
                                    }`}
                                  >
                                    {endDateText}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-xs ltr ${
                                      theme === "dark"
                                        ? "bg-slate-800/40 text-slate-100"
                                        : "bg-slate-200 text-slate-800"
                                    }`}
                                  >
                                    {endTimeText}
                                  </span>
                                </>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded-lg text-xs ${
                                    theme === "dark"
                                      ? "bg-slate-800/40 text-slate-100"
                                      : "bg-slate-200 text-slate-800"
                                  }`}
                                >
                                  اکنون
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-xs ${
                                theme === "dark" ? "text-slate-400" : "text-black"
                              }`}
                            >
                              مدت{" "}
                              {session.state === "on"
                                ? "روشن بودن"
                                : "خاموش بودن"}
                              :{" "}
                              <span className="font-semibold">{durationText}</span>
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </aside>
            )}
        </section>
        </div>
        <section
          className={
            theme === "dark"
              ? "mt-4 rounded-2xl border border-slate-800 bg-slate-950 shadow-xl px-4 py-4"
              : "mt-4 rounded-2xl border border-slate-200 bg-white shadow-xl px-4 py-4"
          }
        >
          {(role === "manager" || role === "admin") && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold">مدیریت کاربران</h2>
                  <p className="mt-1 text-[11px] text-slate-400">
                    تنظیم سطح دسترسی فقط توسط اکانت مدیریت امکان‌پذیر است.
                  </p>
                </div>
                <div>
                  {role === "manager" && (
                    <button
                      type="button"
                      onClick={() => setUsersModalOpen(true)}
                      className={
                        theme === "dark"
                          ? "rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
                          : "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      }
                    >
                      مدیریت پیشرفته کاربران
                    </button>
                  )}
                </div>
              </div>
              {users.length === 0 ? (
                <div
                  className={
                    theme === "dark"
                      ? "rounded-xl border border-dashed border-slate-700 px-4 py-6 text-center text-xs text-slate-500"
                      : "rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500 bg-white"
                  }
                >
                  هیچ کاربری یافت نشد.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {users.map((u) => (
                    <div
                      key={u.username}
                      className={
                        theme === "dark"
                          ? "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 shadow"
                          : "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow"
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{u.username}</span>
                          <span className="text-[11px] text-slate-400">
                            نقش: {u.role === "manager" ? "مدیر" : u.role === "admin" ? "ادمین" : "بیننده"}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                            u.active
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-slate-700/40 text-slate-300"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-current" />
                          {u.active ? "فعال" : "غیرفعال"}
                        </span>
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={!u.active}
                          onClick={() => handleDeactivateUser(u)}
                          className={
                            u.active
                              ? "rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white"
                              : "rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 cursor-not-allowed"
                          }
                        >
                          غیرفعال‌سازی
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold">PDG ها</h2>
              <p className="mt-1 text-[11px] text-slate-400">
                با کلیک روی هر کارت، صفحه PDG در تب جدید باز می‌شود.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                {pdgs.length} دستگاه
              </span>
              {canEditChillers && (
                <button
                  type="button"
                  onClick={() => setPdgModalOpen(true)}
                  className={
                    theme === "dark"
                      ? "rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
                      : "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  }
                >
                  افزودن PDG
                </button>
              )}
            </div>
          </div>
                {pdgs.length === 0 ? (
            <div
              className={
                theme === "dark"
                  ? "rounded-xl border border-dashed border-slate-700 px-4 py-6 text-center text-xs text-slate-500"
                  : "rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500 bg-white"
              }
            >
              هیچ دستگاهی برای PDG تعریف نشده است.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {pdgs.map((pdg) => (
                <div
                  key={pdg.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenPdg(pdg)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpenPdg(pdg);
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
                            ? "border-emerald-500/40 bg-white hover:bg-emerald-50"
                            : "border-slate-200 bg-slate-50 opacity-80 hover:bg-slate-100"
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
                        {pdg.name || "بدون نام"}
                      </span>
                      <span className="text-[11px] text-slate-400 ltr">
                        {pdg.ip}/pdg.index
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                        pdg.active
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          pdg.active ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                      />
                      {pdg.active ? "فعال" : "غیرفعال"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 group-hover:text-blue-300">
                        باز کردن در تب جدید
                      </span>
                      {canEditChillers && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("آیا از حذف این PDG اطمینان دارید؟")) {
                              handleDeletePdg(pdg.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
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
        </section>
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
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                              u.active ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700/40 text-slate-300"
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current" />
                            {u.active ? "فعال" : "غیرفعال"}
                          </span>
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
