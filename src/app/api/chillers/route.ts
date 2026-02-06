import { NextRequest, NextResponse } from "next/server";
import { addChiller, loadChillers } from "@/lib/chillers";
import { getSessionFromCookies } from "@/lib/auth";
import { getUser } from "@/lib/db";

async function requireAddPackage() {
  const s = await getSessionFromCookies();
  if (!s || !s.username) return false;
  const u = getUser(s.username);
  if (!u) return false;
  if (s.role === "admin" || s.role === "manager") return true;
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
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
