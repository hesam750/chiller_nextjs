import { NextRequest, NextResponse } from "next/server";
import { deleteChiller, updateChiller } from "@/lib/chillers";
import { getSessionFromCookies } from "@/lib/auth";
import { getUser, appendActivityLog } from "@/lib/db";
import crypto from "crypto";

async function requireAddPackage() {
  const s = await getSessionFromCookies();
  if (!s || !s.username) return false;
  if (s.role === "admin") return true;
  const u = getUser(s.username);
  if (!u) return false;
  return !!(u.permissions && u.permissions.canAddPackage);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireAddPackage())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const id = (await context.params).id;
  const patch: {
    name?: string;
    ip?: string;
    active?: boolean;
  } = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.ip === "string") patch.ip = body.ip;
  if (typeof body.active === "boolean") patch.active = body.active;
  const item = await updateChiller(id, patch);
  if (!item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const s = await getSessionFromCookies();
  if (s && typeof s.username === "string") {
    appendActivityLog({
      id: crypto.randomBytes(8).toString("hex"),
      username: s.username,
      action: "chiller.update",
      at: new Date().toISOString(),
      details: { id, patch },
    });
  }
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireAddPackage())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const id = (await context.params).id;
  const removed = await deleteChiller(id);
  if (!removed) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const s = await getSessionFromCookies();
  if (s && typeof s.username === "string") {
    appendActivityLog({
      id: crypto.randomBytes(8).toString("hex"),
      username: s.username,
      action: "chiller.delete",
      at: new Date().toISOString(),
      details: { id },
    });
  }
  return NextResponse.json({ ok: true, item: removed });
}
