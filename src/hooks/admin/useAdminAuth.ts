"use client";
import { useState, useEffect } from "react";

export type Role = "admin" | "manager" | "viewer" | "guest";

export function useAdminAuth() {
  const [role, setRole] = useState<Role>("guest");
  const [mePermissions, setMePermissions] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        const r0 = j && typeof j.role === "string" ? j.role : "guest";
        const rr: Role =
          r0 === "admin" || r0 === "manager" || r0 === "viewer"
            ? r0
            : "guest";
        setRole(rr);
        if (j && j.permissions && typeof j.permissions === "object") {
          setMePermissions(j.permissions as Record<string, boolean>);
        } else {
          setMePermissions(null);
        }
        if (rr === "guest") {
          location.href = "/login";
        } else if (rr === "viewer") {
          location.href = "/dashboard";
        }
      })
      .catch(() => {
        setRole("guest");
        location.href = "/login";
      })
      .finally(() => setLoading(false));
  }, []);

  const canEditChillers =
    role === "admin" || !!(mePermissions && mePermissions.canAddPackage);

  return { role, mePermissions, canEditChillers, loading };
}
