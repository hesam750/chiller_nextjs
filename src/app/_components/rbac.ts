"use client";

import { ReactNode, useEffect, useState } from "react";

export type Role = "admin" | "manager" | "viewer" | "guest";

export type Permissions = Record<string, boolean> | null | undefined;

export function canAccess(args: {
  role: Role;
  permissions?: Permissions;
  anyRoles?: Role[];
  anyPerms?: string[];
}) {
  const r = args.role;
  const perms = args.permissions || null;
  const roleOk = Array.isArray(args.anyRoles) ? args.anyRoles.includes(r) : false;
  const permOk = Array.isArray(args.anyPerms)
    ? args.anyPerms.some((k) => !!(perms && (perms as Record<string, boolean>)[k]))
    : false;
  return roleOk || permOk;
}

type Me = {
  role: Role;
  permissions: Record<string, boolean> | null;
};

function parseMe(t: string): Me {
  try {
    const j = JSON.parse(t);
    const r0 = j && typeof j.role === "string" ? j.role : "guest";
    const rr: Role = r0 === "admin" || r0 === "manager" || r0 === "viewer" ? r0 : "guest";
    const p =
      j && j.permissions && typeof j.permissions === "object" ? (j.permissions as Record<string, boolean>) : null;
    return { role: rr, permissions: p };
  } catch {
    return { role: "guest", permissions: null };
  }
}

export function useAccess(args: { anyRoles?: Role[]; anyPerms?: string[] }) {
  const [role, setRole] = useState<Role>("guest");
  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/auth/me");
        const t = await r.text().catch(() => "");
        const me = parseMe(t);
        if (cancelled) return;
        setRole(me.role);
        setPermissions(me.permissions);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allowed = canAccess({ role, permissions, anyRoles: args.anyRoles, anyPerms: args.anyPerms });
  return { allowed, loading, role, permissions };
}

export function WithAccess({
  anyRoles,
  anyPerms,
  children,
  fallback = null,
  loadingFallback = null,
}: {
  anyRoles?: Role[];
  anyPerms?: string[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}) {
  const { allowed, loading } = useAccess({ anyRoles, anyPerms });
  if (loading) return loadingFallback;
  return allowed ? children : fallback;

}
