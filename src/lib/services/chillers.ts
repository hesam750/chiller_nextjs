import type { Chiller } from "@/types/domain";

export async function fetchChillers(): Promise<Chiller[]> {
  try {
    const r = await fetch("/api/chillers");
    const j = await r.json().catch(() => ({}));
    const items = Array.isArray(j.items) ? (j.items as Chiller[]) : [];
    return items;
  } catch {
    return [];
  }
}

export async function addChiller(payload: { name: string; ip: string; active: boolean }): Promise<Chiller | null> {
  try {
    const r = await fetch("/api/chillers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({}));
    return j.item as Chiller;
  } catch {
    return null;
  }
}

export async function updateChiller(id: string, patch: Partial<Pick<Chiller, "name" | "ip" | "active">>): Promise<boolean> {
  try {
    const r = await fetch("/api/chillers/" + encodeURIComponent(id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function deleteChiller(id: string): Promise<boolean> {
  try {
    const r = await fetch("/api/chillers/" + encodeURIComponent(id), { method: "DELETE" });
    return r.ok;
  } catch {
    return false;
  }
}
