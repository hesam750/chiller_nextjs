"use client";

import { useEffect, useState } from "react";
import { WithAccess } from "@/app/_components/rbac";
import { ChillerCard } from "./ChillerCard";
import fanapLogo from "../../../fanap.png";
import { useI18n } from "./i18n";

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
  const [username, setUsername] = useState<string>("");
  const [progressOnSeconds, setProgressOnSeconds] = useState(60);
  const [progressOffSeconds, setProgressOffSeconds] = useState(60);
  const [progressByChiller, setProgressByChiller] = useState<Record<string, { progressOnSeconds: number; progressOffSeconds: number }>>({});
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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [connection, setConnection] = useState<"unknown" | "online" | "offline">(
    "unknown",
  );
  const [introOpen, setIntroOpen] = useState(true);
  const [mePermissions, setMePermissions] = useState<Record<string, boolean> | null>(null);
  const { t } = useI18n();

  

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
      .then(async (r) => {
        if (!r.ok) return { role: "guest" };
        const t = await r.text().catch(() => "");
        if (!t) return { role: "guest" };
        try {
          return JSON.parse(t);
        } catch {
          return { role: "guest" };
        }
      })
      .then((j) => {
        const r0 = j && typeof j.role === "string" ? j.role : "guest";
        const rr: "admin" | "manager" | "viewer" | "guest" =
          r0 === "admin" || r0 === "manager" || r0 === "viewer"
            ? r0
            : "guest";
        setRole(rr);
        const un =
          j && typeof j.username === "string" ? j.username : "";
        setUsername(un || "");
        if (j && j.permissions && typeof j.permissions === "object") {
          setMePermissions(j.permissions as Record<string, boolean>);
        } else {
          setMePermissions(null);
        }
        if (rr === "guest") {
          window.location.replace("/login");
        }
      })
      .catch(() => setRole("guest"));

    fetch("/api/chillers")
      .then(async (r) => {
        if (!r.ok) return { items: [] };
        const t = await r.text().catch(() => "");
        if (!t) return { items: [] };
        try {
          return JSON.parse(t);
        } catch {
          return { items: [] };
        }
      })
      .then((j) => {
        const items = Array.isArray(j.items) ? j.items : [];
        setChillers(items);
      })
      .finally(() => setLoading(false));
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
    const canControl = !!(mePermissions && mePermissions.canTogglePower);
    if (!canControl) {
      showToast(t("no.access.togglePower"), "error");
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
          body: JSON.stringify({ unitName: payload.name, action, user: username }),
        });
      } catch {
      }
      if (payload.next) {
        showToast(t("ok.power.on"), "success");
      } else {
        showToast(t("ok.power.off"), "success");
      }
    } else if (forbidden) {
      showToast(t("err.forbidden"), "error");
    } else if (unreachable) {
      showToast(t("err.unreachable"), "error");
    } else {
      showToast(t("err.power.send"), "error");
    }

    return { ok };
  };

  const handleApplySetpoint = async (payload: {
    name: string;
    ip: string;
    value: number;
  }) => {
    const canControl = !!(mePermissions && mePermissions.canSetTemperature);
    if (!canControl) {
      showToast(t("no.access.setTemperature"), "error");
      return { ok: false };
    }
    if (!payload.ip) {
      showToast(t("err.noIp"), "error");
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
      showToast(t("ok.setpoint"), "success");
    } else if (forbidden) {
      showToast(t("err.setpoint.forbidden"), "error");
    } else if (unreachable) {
      showToast(t("err.setpoint.unreachable"), "error");
    } else {
      showToast(t("err.setpoint.send"), "error");
    }

    return { ok, actual };
  };

  useEffect(() => {
    const value = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", value);
  }, [theme]);

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      window.location.replace("/login");
    });
  };

  const canControlChillers = !!(mePermissions && (mePermissions.canTogglePower || mePermissions.canSetTemperature || mePermissions.canControlTimer));

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isDark ? "bg-[#0f141a] text-zinc-50" : "bg-[#f7f9fc] text-[#1f2937]"
      }`}
    >
      <header
        className={`border-b px-4 py-2 sm:px-6 sm:py-3 ${
          isDark ? "border-zinc-800 bg-[#0f1722]" : "border-[#e6edf7] bg-[#f9fafb]"
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img src={fanapLogo.src} alt="Fanap" className="h-6 w-auto shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm sm:text:base truncate">{t("app.title")}</span>
                <span className={`text-[11px] sm:text-xs truncate ${isDark ? "text-slate-400" : "text-zinc-500"}`}>
                  {t("app.subtitle")}
                </span>
              </div>
            </div>
          </div>
          <div
            className={`inline-flex items-center gap-2 px-2 py-2 rounded-2xl border ${
            isDark ? "border-zinc-700 bg-white/5" : "border-[#dbe5f1] bg-[#eef3fb]"
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
                <circle cx="12" cy="12" r="6" className={
                  connection === "online" ? "fill-emerald-400" : connection === "offline" ? "fill-red-500" : "fill-amber-400"
                } />
              </svg>
              {connection === "online"
                ? t("connection.online")
                : connection === "offline"
                  ? t("connection.offline")
                  : t("connection.connecting")}
            </span>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition ${
                isDark
                  ? "bg-white/10 hover:bg-white/15 text-slate-100"
                : "bg-[#ffffff] hover:bg-[#eef3fb] text-[#334155]"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                <path d="M12 2a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" className={isDark ? "fill-slate-200" : "fill-zinc-800"} />
              </svg>
              {theme === "dark" ? t("theme.dark") : t("theme.light")}
            </button>
            <a
              href="/admin"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition ${
                isDark
                  ? "bg-white/10 hover:bg-white/15 text-slate-100"
                : "bg-[#ffffff] hover:bg-[#eef3fb] text-[#334155]"
              }`}
            >
              <WithAccess anyRoles={["admin", "manager"]}>
                <>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                    <path d="M12 6l2 3 4 .5-3 2.5.8 3.9-3.8-1.8-3.8 1.8.8-3.9-3-2.5 4-.5 2-3z" className={isDark ? "fill-slate-200" : "fill-zinc-800"} />
                  </svg>
                  {t("admin.nav")}
                </>
              </WithAccess>
            </a>
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
                <path d="M10 3h8a1 1 0 0 1 1 1v4h-2V5h-6v14h6v-3h2v4a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm4 8h-8v2h8v3l4-4-4-4v3z" className={isDark ? "fill-slate-200" : "fill-zinc-800"} />
              </svg>
              {t("logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 lg:px-6 lg:py-6">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">{t("chillers")}</h1>
            {loading && <span className="text-xs text-zinc-400">{t("loading.generic")}</span>}
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
                progressOnSeconds={
                  (progressByChiller[c.id]?.progressOnSeconds ?? progressOnSeconds)
                }
                progressOffSeconds={
                  (progressByChiller[c.id]?.progressOffSeconds ?? progressOffSeconds)
                }
                onTogglePower={handleTogglePower}
                onApplySetpoint={handleApplySetpoint}
              />
            ))}
            {!loading && chillers.length === 0 && (
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
