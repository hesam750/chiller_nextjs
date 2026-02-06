type SettingsItem = {
  progressOnSeconds: number;
  progressOffSeconds: number;
};

export async function getGlobalSettings(): Promise<SettingsItem> {
  try {
    const r = await fetch("/api/settings");
    const j = await r.json().catch(() => ({}));
    const item = j && j.item ? (j.item as SettingsItem) : { progressOnSeconds: 60, progressOffSeconds: 60 };
    return {
      progressOnSeconds: Math.max(1, Math.round(Number(item.progressOnSeconds) || 60)),
      progressOffSeconds: Math.max(1, Math.round(Number(item.progressOffSeconds) || 60)),
    };
  } catch {
    return { progressOnSeconds: 60, progressOffSeconds: 60 };
  }
}

export async function getSettingsForChiller(chillerId: string): Promise<SettingsItem | null> {
  try {
    const r = await fetch("/api/settings?chillerId=" + encodeURIComponent(chillerId));
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({}));
    const item = j && j.item ? (j.item as SettingsItem) : null;
    if (!item) return null;
    return {
      progressOnSeconds: Math.max(1, Math.round(Number(item.progressOnSeconds) || 0)),
      progressOffSeconds: Math.max(1, Math.round(Number(item.progressOffSeconds) || 0)),
    };
  } catch {
    return null;
  }
}

export async function updateChillerSettings(args: { chillerId: string; progressOnSeconds: number; progressOffSeconds: number }): Promise<SettingsItem | null> {
  try {
    const r = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chillerId: args.chillerId,
        progressOnSeconds: Math.max(1, Math.round(Number(args.progressOnSeconds) || 0)),
        progressOffSeconds: Math.max(1, Math.round(Number(args.progressOffSeconds) || 0)),
      }),
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({}));
    const item = j && j.item ? (j.item as SettingsItem) : null;
    if (!item) return null;
    return {
      progressOnSeconds: Math.max(1, Math.round(Number(item.progressOnSeconds) || 0)),
      progressOffSeconds: Math.max(1, Math.round(Number(item.progressOffSeconds) || 0)),
    };
  } catch {
    return null;
  }
}
