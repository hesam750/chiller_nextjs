import { NextRequest, NextResponse } from "next/server";
import { addChiller, loadChillers } from "@/lib/chillers";
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

export async function GET() {
  try {
    const items = await loadChillers();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAddPackage())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.ip !== "string" ||
    typeof body.active !== "boolean"
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const item = await addChiller({
      name: body.name,
      ip: body.ip,
      active: body.active,
    });
    const s = await getSessionFromCookies();
    if (s && typeof s.username === "string") {
      appendActivityLog({
        id: crypto.randomBytes(8).toString("hex"),
        username: s.username,
        action: "chiller.create",
        at: new Date().toISOString(),
        details: { id: item.id, name: item.name, ip: item.ip, active: item.active },
      });
    }
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
