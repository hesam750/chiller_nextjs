// hooks/chiller/useChillerPolling.ts
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchChillerStatus } from "@/lib/services/chiller-api";

interface PollingState {
  powerOn: boolean;
  fanOn: boolean;
  tempCurrent: number;
  setpoint: number;
  season: "summer" | "winter";
  isOnline: boolean;
}

export function useChillerPolling(ip: string, intervalMs = 8000) {
  const [state, setState] = useState<PollingState>({
    powerOn: false,
    fanOn: false,
    tempCurrent: 0,
    setpoint: 0,
    season: "summer",
    isOnline: true,
  });
  const mountedRef = useRef(true);
  const visibilityRef = useRef(true);

  const poll = useCallback(async () => {
    try {
      const data = await fetchChillerStatus(ip);
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        powerOn: data.power === "on",
        fanOn: data.fanOn,
        tempCurrent: data.tempCurrent,
        setpoint: data.setpoint,
        season: data.season,
        isOnline: true,
      }));
    } catch {
      if (!mountedRef.current) return;
      setState((prev) => ({ ...prev, isOnline: false }));
    }
  }, [ip]);

  useEffect(() => {
    mountedRef.current = true;
    poll(); // initial fetch
    const id = setInterval(poll, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [poll, intervalMs]);

  // Refresh when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !visibilityRef.current) {
        poll();
      }
      visibilityRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [poll]);

  return state;
}
