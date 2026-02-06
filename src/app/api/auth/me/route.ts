import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getUser } from "@/lib/db";

export async function GET() {
  const session = await getSessionFromCookies();
  const role = session?.role || "guest";
  const username = session?.username || null;
  let permissions: Record<string, boolean> | null = null;
  if (username) {
    const u = getUser(username);
    if (u && u.permissions) {
      permissions = {
        canViewTimer: !!u.permissions.canViewTimer,
        canControlTimer: !!u.permissions.canControlTimer,
        canTogglePower: !!u.permissions.canTogglePower,
        canSetTemperature: !!u.permissions.canSetTemperature,
        canAddPackage: !!u.permissions.canAddPackage,
        canManageUsers: !!u.permissions.canManageUsers,
        canViewLogs: !!u.permissions.canViewLogs,
        canViewChillers: !!u.permissions.canViewChillers,
        canViewPdgs: !!u.permissions.canViewPdgs,
        canViewUserActivity: !!u.permissions.canViewUserActivity,
      };
    }
  }
  return NextResponse.json({ role, username, permissions });
}
