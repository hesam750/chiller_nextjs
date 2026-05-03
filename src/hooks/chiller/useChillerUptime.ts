// hooks/chiller/useChillerUptime.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchUptime } from "@/lib/services/chiller-api";

export function useChillerUptime(ip: string, powerOn: boolean) {
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchUptime(ip);
      setUptimeSeconds(data.uptimeSeconds);
    } catch {}
  }, [ip]);

  // Poll uptime every 5 seconds
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  // Local increment every second when powered on
  useEffect(() => {
    if (!powerOn) return;
    const id = setInterval(() => {
      setUptimeSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [powerOn]);

  return { uptimeSeconds, refreshUptime: refresh };
}
