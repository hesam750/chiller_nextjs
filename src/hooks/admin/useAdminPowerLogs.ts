"use client";
import { useState, useEffect, useMemo } from "react";

export type PowerLog = {
  id: string;
  unitName: string;
  action: "on" | "off";
  at: string;
  user?: string;
};

export type PowerSession = {
  id: string;
  unitName: string;
  state: "on" | "off";
  startAt: string;
  endAt?: string;
  durationMs: number;
};

interface UseAdminPowerLogsOptions {
  mePermissions: Record<string, boolean> | null;
}

export function useAdminPowerLogs({ mePermissions }: UseAdminPowerLogsOptions) {
  const [logs, setLogs] = useState<PowerLog[]>([]);
  const [now, setNow] = useState(() => Date.now());

  // Load power logs
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

  // Update current time
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

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

  return {
    logs,
    now,
    powerSessions,
  };
}
