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
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    try {
      const stored = window.localStorage.getItem("dashboard-theme");
      if (stored === "dark" || stored === "light") {
        return stored;
      }
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: light)").matches
      ) {
        return "light";
      }
    } catch {
    }
    return "dark";
  });

  useEffect(() => {
    const value = theme === "dark" ? "dark" : "light";
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", value);
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("dashboard-theme", value);
      } catch {
      }
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
        setToast({ message: "خطا در دریافت لیست چیلرها", type: "error" });
        setToastVisible(true);
        setTimeout(() => {
          setToastVisible(false);
        }, 4000);
      });
  }, []);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
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

  const canEditChillers = role === "admin";
  const canSeeChillersSection = role === "admin";

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  const reload = () => {
    fetch("/api/chillers")
      .then((r) => r.json())
      .then((j) => setChillers(j.items || []))
      .catch(() => {
        setMsg("خطا در دریافت لیست");
        showToast("خطا در دریافت لیست چیلرها", "error");
      });
  };

  const handleAdd = async () => {
    if (!canEditChillers) {
      showToast("شما دسترسی افزودن چیلر را ندارید", "error");
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
      showToast("خطا در افزودن چیلر", "error");
      return;
    }
    const data = await res.json();
    setChillers((prev) => [...prev, data.item]);
    setName("");
    setIp("");
    setActive(true);
    setMsg("افزوده شد");
    showToast("چیلر با موفقیت افزوده شد", "success");
  };

  const handleSave = async (c: Chiller) => {
    if (!canEditChillers) {
      showToast("شما دسترسی ویرایش چیلر را ندارید", "error");
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
      showToast("خطا در ذخیره تغییرات چیلر", "error");
      return;
    }
    setMsg("ذخیره شد");
    showToast("تغییرات چیلر با موفقیت ذخیره شد", "success");
  };

  const handleDelete = async (id: string) => {
    if (!canEditChillers) {
      showToast("شما دسترسی حذف چیلر را ندارید", "error");
      return;
    }
    const res = await fetch("/api/chillers/" + encodeURIComponent(id), {
      method: "DELETE",
    });
    if (!res.ok) {
      setMsg("خطا در حذف");
      showToast("خطا در حذف چیلر", "error");
      return;
    }
    setChillers((prev) => prev.filter((x) => x.id !== id));
    setMsg("حذف شد");
    showToast("چیلر با موفقیت حذف شد", "success");
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
                <div className="text-[11px] text-slate-400 mb-1">تعداد چیلرها</div>
                <div className="text-2xl font-semibold">{chillers.length}</div>
              </div>
              <div
                className={
                  theme === "dark"
                    ? "rounded-2xl border border-emerald-600/70 bg-emerald-900/10 px-4 py-3 shadow"
                    : "rounded-2xl border border-emerald-500/40 bg-emerald-50 px-4 py-3 shadow"
                }
              >
                <div className="text-[11px] text-emerald-300 mb-1">چیلرهای فعال</div>
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
                <div className="text-sm font-semibold">افزودن چیلر</div>
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
                      placeholder="مثلاً چیلر ۱"
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
                      افزودن
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
                      تازه‌سازی
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
                <h4 className="mb-3 text-sm font-semibold">چیلرها</h4>
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
          </section>
        </div>

        <section
          className={
            theme === "dark"
              ? "mt-4 rounded-2xl border border-slate-800 bg-slate-950 shadow-xl px-4 py-4"
              : "mt-4 rounded-2xl border border-slate-200 bg-white shadow-xl px-4 py-4"
          }
        >
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
      </main>
    </div>
  );
}
