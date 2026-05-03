// hooks/useConnectionStatus.ts
import { useState, useEffect, useRef } from "react";

export function useConnectionStatus(ips: string[]) {
  const [connection, setConnection] = useState<"unknown" | "online" | "offline">("unknown");

  useEffect(() => {
    if (ips.length === 0) return;
    let cancelled = false;
    const check = () => {
      Promise.all(
        ips.map((ip) =>
          fetch(`/api/chiller-control?ip=${encodeURIComponent(ip)}`)
            .then((r) => r.json())
            .then((j) => (j && typeof j.reachable === "boolean" ? j.reachable : false))
            .catch(() => false)
        )
      ).then((results) => {
        if (cancelled) return;
        setConnection(results.some((x) => x) ? "online" : "offline");
      });
    };
    check();
    const id = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [ips.join(",")]);

  return connection;
}
