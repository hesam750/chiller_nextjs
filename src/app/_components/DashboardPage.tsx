"use client";

import { useEffect, useState } from "react";
import { ChillerCard } from "./ChillerCard";
import fanapLogo from "../../../fanap.png";

type Chiller = {
  id: string;
  name: string;
  ip: string;
  active: boolean;
};

export function DashboardPage() {
  const [chillers, setChillers] = useState<Chiller[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"admin" | "manager" | "viewer" | "guest">(
    "guest",
  );
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [connection, setConnection] = useState<"unknown" | "online" | "offline">(
    "unknown",
  );
  const [introOpen, setIntroOpen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    Promise.resolve().then(() => {
      try {
        const stored = window.localStorage.getItem("dashboard-theme");
        if (stored === "dark" || stored === "light") {
          setTheme(stored);
        } else if (
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: light)").matches
        ) {
          setTheme("light");
        }
      } catch {
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!chillers.length) {
      return () => {
        cancelled = true;
      };
    }
    const activeWithIp = chillers.find(
      (c) => c.active && typeof c.ip === "string" && c.ip.trim().length > 0,
    );
    if (!activeWithIp) {
      return () => {
        cancelled = true;
      };
    }
    const ip = activeWithIp.ip.trim();
    const check = () => {
      fetch(`/api/chiller-control?ip=${encodeURIComponent(ip)}`)
        .then((r) => r.json())
        .then((j) => {
          if (cancelled) return;
          const reachable = j && typeof j.reachable === "boolean" ? j.reachable : false;
          setConnection(reachable ? "online" : "offline");
        })
        .catch(() => {
          if (cancelled) return;
          setConnection("offline");
        });
    };
    check();
    const id = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [chillers]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        const r0 = j && typeof j.role === "string" ? j.role : "guest";
        const rr: "admin" | "manager" | "viewer" | "guest" =
          r0 === "admin" || r0 === "manager" || r0 === "viewer"
            ? r0
            : "guest";
        setRole(rr);
        if (rr === "guest") {
          window.location.replace("/login");
        }
      })
      .catch(() => setRole("guest"));

    fetch("/api/chillers")
      .then((r) => r.json())
      .then((j) => {
        setChillers(j.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!introOpen) return;
    const id = setTimeout(() => {
      setIntroOpen(false);
    }, 6000);
    return () => clearTimeout(id);
  }, [introOpen]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  const handleTogglePower = async (payload: { name: string; ip: string; next: boolean }) => {
    const canControl = role === "admin" || role === "manager";
    if (!canControl) {
      showToast("شما دسترسی خاموش و روشن کردن این چیلر را ندارید", "error");
      return { ok: false };
    }
    const action = payload.next ? "on" : "off";
    let ok = false;
    let unreachable = false;
    let forbidden = false;
    try {
      const res = await fetch("/api/chiller-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: payload.ip, kind: "power", target: payload.next }),
      });
      if (!res.ok) {
        if (res.status === 403) {
          forbidden = true;
        } else {
          unreachable = true;
        }
      } else {
        const j = await res.json().catch(() => null);
        ok = !!(j && j.ok);
        if (!ok && j && j.error === "forbidden") {
          forbidden = true;
        }
      }
    } catch {
      ok = false;
      unreachable = true;
    }

    if (ok) {
      try {
        await fetch("/api/power-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitName: payload.name, action }),
        });
      } catch {
      }
      if (payload.next) {
        showToast("چیلر با موفقیت روشن شد", "success");
      } else {
        showToast("چیلر با موفقیت خاموش شد", "success");
      }
    } else if (forbidden) {
      showToast("اجازه اجرای این دستور را ندارید", "error");
    } else if (unreachable) {
      showToast("ارتباط با چیلر برقرار نشد", "error");
    } else {
      showToast("خطا در ارسال دستور به چیلر", "error");
    }

    return { ok };
  };

  const handleApplySetpoint = async (payload: {
    name: string;
    ip: string;
    value: number;
  }) => {
    const canControl = role === "admin" || role === "manager";
    if (!canControl) {
      showToast("شما دسترسی تنظیم دمای این چیلر را ندارید", "error");
      return { ok: false };
    }
    if (!payload.ip) {
      showToast("IP چیلر تنظیم نشده است", "error");
      return { ok: false };
    }
    let ok = false;
    let unreachable = false;
    let forbidden = false;
    let actual: number | null = null;
    try {
      const res = await fetch("/api/chiller-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: payload.ip,
          kind: "setpoint",
          value: payload.value,
        }),
      });
      if (!res.ok) {
        if (res.status === 403) {
          forbidden = true;
        } else {
          unreachable = true;
        }
      } else {
        const j = await res.json().catch(() => null);
        ok = !!(j && j.ok);
        if (!ok && j && j.error === "forbidden") {
          forbidden = true;
        }
        if (j && typeof j.actual === "number") {
          actual = j.actual;
        }
      }
    } catch {
      ok = false;
      unreachable = true;
    }

    if (ok) {
      showToast("دمای کامفورت با موفقیت اعمال شد", "success");
    } else if (forbidden) {
      showToast("اجازه تنظیم دمای این چیلر را ندارید", "error");
    } else if (unreachable) {
      showToast("ارتباط با چیلر برقرار نشد", "error");
    } else {
      showToast("خطا در ارسال تنظیم دما به چیلر", "error");
    }

    return { ok, actual };
  };

  useEffect(() => {
    const value = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", value);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("dashboard-theme", value);
      } catch {
      }
    }
  }, [theme]);

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      window.location.replace("/login");
    });
  };

  const canControlChillers = role === "admin" || role === "manager";

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isDark ? "bg-[#0f141a] text-zinc-50" : "bg-zinc-50 text-zinc-900"
      }`}
    >
      <header
        className={`border-b px-4 py-2 sm:px-6 sm:py-3 ${
          isDark ? "border-zinc-800 bg-[#0f1722]" : "border-zinc-200 bg-white"
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img src={fanapLogo.src} alt="Fanap" className="h-6 w-auto shrink-0" />
              <span className="font-semibold text-sm sm:text-base truncate">
                سیستم سرمایشی فناپ تک
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-bold border ${
                connection === "online"
                  ? isDark
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                  : connection === "offline"
                    ? isDark
                      ? "border-red-500/60 bg-red-500/10 text-red-400"
                      : "border-red-500/40 bg-red-50 text-red-600"
                    : isDark
                      ? "border-amber-400/60 bg-amber-500/10 text-amber-300"
                      : "border-amber-400/50 bg-amber-50 text-amber-600"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connection === "online"
                    ? "bg-emerald-400"
                    : connection === "offline"
                      ? "bg-red-500"
                      : "bg-amber-400"
                }`}
              />
              {connection === "online"
                ? "متصل"
                : connection === "offline"
                  ? "ارتباط با چیلر قطع هستش"
                  : "در حال اتصال..."}
            </span>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                isDark
                  ? "bg-white/10 border-zinc-700 hover:bg-white/15"
                  : "bg-zinc-100 border-zinc-300 hover:bg-zinc-200"
              }`}
            >
              تم: {theme === "dark" ? "تاریک" : "روشن"}
            </button>
            <a
              href="/admin"
              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                isDark
                  ? "bg-white/10 border-zinc-700 hover:bg-white/15"
                  : "bg-zinc-100 border-zinc-300 hover:bg-zinc-200"
              }`}
            >
              مدیریت
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                isDark
                  ? "bg-white/10 border-zinc-700 hover:bg-white/15"
                  : "bg-zinc-100 border-zinc-300 hover:bg-zinc-200"
              }`}
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 lg:px-6 lg:py-6">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">چیلرها</h1>
            {loading && <span className="text-xs text-zinc-400">در حال بارگذاری...</span>}
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {chillers.map((c) => (
              <ChillerCard
                key={c.id}
                name={c.name}
                ip={c.ip}
                active={c.active}
                mode={theme}
                canControl={canControlChillers}
                onTogglePower={handleTogglePower}
                onApplySetpoint={handleApplySetpoint}
              />
            ))}
            {!loading && chillers.length === 0 && (
              <div
                className={`rounded-2xl border border-dashed p-6 text-sm flex items-center justify-center ${
                  isDark
                    ? "border-zinc-700/70 text-zinc-400"
                    : "border-zinc-300 text-zinc-500 bg-white"
                }`}
              >
                هیچ چیلری در تنظیمات تعریف نشده است.
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
                : "bg-white border-slate-200 text-zinc-900"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-sky-500/40 border-t-transparent animate-spin" />
                <div className="absolute inset-1 rounded-full bg-sky-500/10" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-center">
                در حال آماده‌سازی اطلاعات سیستم
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-center max-w-sm">
                تا آماده شدن اطلاعات چیلرها ممکن است چندین ثانیه زمان نیاز باشد.
                از صبوری و شکیبایی شما سپاسگزاریم.
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
              متوجه شدم
            </button>
          </div>
        </div>
      )}
      {toast && toastVisible && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-sm sm:text-base shadow-2xl z-50 max-w-[90%] sm:max-w-xl text-center ${
            toast.type === "success"
              ? isDark
                ? "bg-emerald-600 text-white"
                : "bg-emerald-500 text-white"
              : isDark
                ? "bg-red-600 text-white"
                : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
