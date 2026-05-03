// hooks/chiller/useChillerStartup.ts
"use client";
import { useState, useEffect, useCallback } from "react";

type StartingMode = "on" | "off" | null;

export function useChillerStartup(progressOnSeconds: number, progressOffSeconds: number) {
  const [starting, setStarting] = useState(false);
  const [startingMode, setStartingMode] = useState<StartingMode>(null);
  const [startingSeconds, setStartingSeconds] = useState(0);

  const triggerStartup = useCallback(
    (mode: "on" | "off") => {
      const seconds = mode === "on" ? progressOnSeconds : progressOffSeconds;
      if (seconds <= 0) return; // no progress configured
      setStarting(true);
      setStartingMode(mode);
      setStartingSeconds(seconds);
    },
    [progressOnSeconds, progressOffSeconds]
  );

  useEffect(() => {
    if (!starting) return;
    if (startingSeconds <= 0) {
      setStarting(false);
      setStartingMode(null);
      return;
    }
    const id = setInterval(() => {
      setStartingSeconds((s) => s - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [starting, startingSeconds]);

  return { starting, startingMode, startingSeconds, triggerStartup };
}
