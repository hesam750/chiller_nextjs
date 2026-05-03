// services/chiller-api.ts
export type PowerAction = "on" | "off";

export async function fetchChillerStatus(ip: string): Promise<{
  power: PowerAction;
  tempCurrent: number;
  setpoint: number;
  fanOn: boolean;
  season: "summer" | "winter";
}> {
  const res = await fetch(`/api/chiller-status?ip=${encodeURIComponent(ip)}`);
  if (!res.ok) throw new Error(`Failed to fetch status: ${res.status}`);
  return res.json();
}

export async function toggleChillerPower(ip: string, action: PowerAction): Promise<void> {
  const res = await fetch(`/api/chiller-power`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, action }),
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error("forbidden");
    throw new Error("unreachable");
  }
}

export async function setChillerSetpoint(ip: string, setpoint: number): Promise<void> {
  const res = await fetch(`/api/chiller-setpoint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, setpoint }),
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error("forbidden");
    throw new Error("unreachable");
  }
}

export async function setChillerSeason(ip: string, season: "summer" | "winter"): Promise<void> {
  const res = await fetch(`/api/chiller-season`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, season }),
  });
  if (!res.ok) throw new Error("unreachable");
}

export async function fetchUptime(ip: string): Promise<{ powerOn: boolean; uptimeSeconds: number }> {
  const res = await fetch(`/api/power-uptime?ip=${encodeURIComponent(ip)}`);
  if (!res.ok) throw new Error("Failed to fetch uptime");
  return res.json();
}

export async function fetchTimers(ip: string): Promise<{
  mode: "on" | "off" | null;
  target: string;
  jDate: string;
  hour: number;
  minute: number;
} | null> {
  const res = await fetch(`/api/timers?ip=${encodeURIComponent(ip)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function submitTimer(
  ip: string,
  mode: "on" | "off",
  targetIso: string
): Promise<void> {
  await fetch(`/api/timers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, mode, target: targetIso }),
  });
}

export async function cancelTimer(ip: string): Promise<void> {
  await fetch(`/api/timers`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip }),
  });
}
