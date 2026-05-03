import { useCallback } from "react";
import { useI18n } from "@/app/_components/i18n";

interface UseChillerActionsOptions {
  permissions: boolean;
  username: string;
  showToast: (message: string, type: "success" | "error") => void;
}

export function useChillerActions(options: UseChillerActionsOptions) {
  const { permissions, username, showToast } = options;
  const { t } = useI18n();

  const handleTogglePower = useCallback(async (payload: { name: string; ip: string; next: boolean }) => {
    if (!permissions) {
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
      } catch { }
      showToast(payload.next ? t("ok.power.on") : t("ok.power.off"), "success");
    } else if (forbidden) {
      showToast(t("err.forbidden"), "error");
    } else if (unreachable) {
      showToast(t("err.unreachable"), "error");
    } else {
      showToast(t("err.power.send"), "error");
    }
    return { ok };
  }, [permissions, username, showToast, t]);

  const handleApplySetpoint = useCallback(async (payload: { name: string; ip: string; value: number }) => {
    if (!permissions) {
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
  }, [permissions, showToast, t]);

  const handleChangeSeason = useCallback(async (payload: { name: string; ip: string; season: "winter" | "summer" }) => {
    if (!permissions) {
      showToast(t("no.access.season"), "error");
      return { ok: false };
    }
    if (!payload.ip) {
      showToast(t("err.noIp"), "error");
      return { ok: false };
    }
    let ok = false;
    let unreachable = false;
    let forbidden = false;
    try {
      const res = await fetch("/api/chiller-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: payload.ip,
          kind: "season",
          season: payload.season,
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
      }
    } catch {
      ok = false;
      unreachable = true;
    }
    if (ok) {
      showToast(t("ok.season.set"), "success");
    } else if (forbidden) {
      showToast(t("err.season.forbidden"), "error");
    } else if (unreachable) {
      showToast(t("err.season.unreachable"), "error");
    } else {
      showToast(t("err.season.send"), "error");
    }
    return { ok };
  }, [permissions, showToast, t]);

  return { handleTogglePower, handleApplySetpoint, handleChangeSeason };
}
