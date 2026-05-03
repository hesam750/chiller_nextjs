import { useState, useEffect } from "react";
import type { Chiller } from "@/lib/chillers";

export function useChillerList() {
  const [chillers, setChillers] = useState<Chiller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/chillers")
      .then(async (r) => {
        if (!r.ok) return { items: [] };
        const text = await r.text();
        if (!text) return { items: [] };
        try {
          return JSON.parse(text);
        } catch {
          return { items: [] };
        }
      })
      .then((j) => {
        setChillers(Array.isArray(j.items) ? j.items : []);
      })
      .catch(() => setChillers([]))
      .finally(() => setLoading(false));
  }, []);

  return { chillers, loading, setChillers };
}
