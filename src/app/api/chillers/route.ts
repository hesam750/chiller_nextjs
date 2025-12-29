import { NextRequest, NextResponse } from "next/server";
import { addChiller, loadChillers } from "@/lib/chillers";
import { getSessionFromCookies } from "@/lib/auth";

async function requireAdmin() {
  const s = await getSessionFromCookies();
  return s && s.role === "admin";
}

export async function GET() {
  const items = await loadChillers();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
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
  const item = await addChiller({
    name: body.name,
    ip: body.ip,
    active: body.active,
  });
  return NextResponse.json({ ok: true, item });
}
