import { NextRequest, NextResponse } from "next/server";
import { deleteChiller, updateChiller } from "@/lib/chillers";
import { getSessionFromCookies } from "@/lib/auth";

async function requireAdmin() {
  const s = await getSessionFromCookies();
  return s && s.role === "admin";
}

export async function PUT(
  req: NextRequest,
  context: { params: { id: string } },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const id = context.params.id;
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
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const id = context.params.id;
  const removed = await deleteChiller(id);
  if (!removed) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, item: removed });
}
