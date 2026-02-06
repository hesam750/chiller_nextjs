import type { PowerLog } from "@/types/domain";

export async function fetchPowerLog(): Promise<PowerLog[]> {
  try {
    const r = await fetch("/api/power-log");
    const j = await r.json().catch(() => ({}));
    const items = Array.isArray(j.items) ? (j.items as PowerLog[]) : [];
    return items;
  } catch {
    return [];
  }
}
