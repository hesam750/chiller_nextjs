import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getUser, upsertUser, listUsers, deleteUser } from "@/lib/db";
import crypto from "crypto";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "manager" && session.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const items = listUsers();
  return NextResponse.json({
    items: items.map((u) => ({
      username: u.username,
      role: u.role,
      active: u.active,
      permissions: u.permissions || undefined,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "manager" && session.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.username !== "string" ||
    typeof body.active !== "boolean"
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const username = body.username.trim();
  const active = !!body.active;
  const user = getUser(username);
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const updated = { ...user, active };
  upsertUser(updated);
  return NextResponse.json({
    ok: true,
    item: { username: updated.username, role: updated.role, active: updated.active },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "manager") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.username !== "string" ||
    typeof body.password !== "string" ||
    typeof body.role !== "string"
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const username = body.username.trim();
  const password = body.password;
  const role = body.role === "admin" || body.role === "manager" || body.role === "viewer" ? body.role : "viewer";
  const active = body.active === false ? false : true;
  const permissions =
    body.permissions && typeof body.permissions === "object"
      ? {
          canViewTimer: !!body.permissions.canViewTimer,
          canControlTimer: !!body.permissions.canControlTimer,
          canTogglePower: !!body.permissions.canTogglePower,
          canSetTemperature: !!body.permissions.canSetTemperature,
          canAddPackage: !!body.permissions.canAddPackage,
          canManageUsers: !!body.permissions.canManageUsers,
          canViewLogs: !!body.permissions.canViewLogs,
        }
      : undefined;
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  const existing = getUser(username);
  if (existing) {
    return NextResponse.json({ error: "conflict" }, { status: 409 });
  }
  upsertUser({ username, passwordHash, role, active, permissions });
  return NextResponse.json({
    ok: true,
    item: { username, role, active, permissions },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "manager") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.username !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const username = body.username.trim();
  const cur = getUser(username);
  if (!cur) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const nextRole =
    typeof body.role === "string" && (body.role === "admin" || body.role === "manager" || body.role === "viewer")
      ? body.role
      : cur.role;
  const nextActive = body.active === false ? false : body.active === true ? true : cur.active;
  const nextPermissions =
    body.permissions && typeof body.permissions === "object"
      ? {
          canViewTimer:
            typeof body.permissions.canViewTimer === "boolean" ? body.permissions.canViewTimer : cur.permissions?.canViewTimer,
          canControlTimer:
            typeof body.permissions.canControlTimer === "boolean"
              ? body.permissions.canControlTimer
              : cur.permissions?.canControlTimer,
          canTogglePower:
            typeof body.permissions.canTogglePower === "boolean"
              ? body.permissions.canTogglePower
              : cur.permissions?.canTogglePower,
          canSetTemperature:
            typeof body.permissions.canSetTemperature === "boolean"
              ? body.permissions.canSetTemperature
              : cur.permissions?.canSetTemperature,
          canAddPackage:
            typeof body.permissions.canAddPackage === "boolean"
              ? body.permissions.canAddPackage
              : cur.permissions?.canAddPackage,
          canManageUsers:
            typeof body.permissions.canManageUsers === "boolean"
              ? body.permissions.canManageUsers
              : cur.permissions?.canManageUsers,
          canViewLogs:
            typeof body.permissions.canViewLogs === "boolean"
              ? body.permissions.canViewLogs
              : cur.permissions?.canViewLogs,
        }
      : cur.permissions;
  let nextPasswordHash = cur.passwordHash;
  if (typeof body.password === "string" && body.password.trim().length) {
    nextPasswordHash = crypto.createHash("sha256").update(body.password).digest("hex");
  }
  const updated = {
    ...cur,
    role: nextRole,
    active: nextActive,
    permissions: nextPermissions,
    passwordHash: nextPasswordHash,
  };
  upsertUser(updated);
  return NextResponse.json({
    ok: true,
    item: { username: updated.username, role: updated.role, active: updated.active, permissions: updated.permissions || undefined },
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "manager") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.username !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const username = body.username.trim();
  const cur = getUser(username);
  if (!cur) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  deleteUser(username);
  return NextResponse.json({ ok: true });
}
