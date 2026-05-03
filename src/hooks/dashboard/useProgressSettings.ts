import { useState, useEffect } from "react";
import type { Chiller } from "@/lib/chillers";

export function useProgressSettings(chillers: Chiller[]) {
  const [progressOnSeconds, setProgressOnSeconds] = useState(60);
  const [progressOffSeconds, setProgressOffSeconds] = useState(60);
  const [progressByChiller, setProgressByChiller] = useState<
    Record<string, { progressOnSeconds: number; progressOffSeconds: number }>
  >({});

  // Global settings
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

  // Per-chiller settings
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
        })
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

  return { progressOnSeconds, progressOffSeconds, progressByChiller };
}
