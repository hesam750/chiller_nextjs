import { useState, useEffect } from "react";

export function usePermissions() {
  const [role, setRole] = useState<"admin" | "manager" | "viewer" | "guest">("guest");
  const [username, setUsername] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) return { role: "guest" };
        const text = await r.text();
        if (!text) return { role: "guest" };
        try {
          return JSON.parse(text);
        } catch {
          return { role: "guest" };
        }
      })
      .then((j) => {
        const r0 = j && typeof j.role === "string" ? j.role : "guest";
        const rr: "admin" | "manager" | "viewer" | "guest" =
          r0 === "admin" || r0 === "manager" || r0 === "viewer" ? r0 : "guest";
        setRole(rr);
        setUsername((j && typeof j.username === "string") ? j.username : "");
        setPermissions((j && j.permissions && typeof j.permissions === "object") ? j.permissions : null);
        if (rr === "guest") window.location.replace("/login");
      })
      .catch(() => setRole("guest"));
  }, []);

  const canControlChillers = !!(permissions && (
    permissions.canTogglePower || permissions.canSetTemperature || permissions.canControlTimer
  ));

  return {
    role,
    username,
    permissions,
    canControl: canControlChillers,
    canTogglePower: !!(permissions && permissions.canTogglePower),
    canSetTemperature: !!(permissions && permissions.canSetTemperature),
    canControlTimer: !!(permissions && permissions.canControlTimer),
  };
}
