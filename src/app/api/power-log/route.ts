import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { appendPowerLog, getPowerLogs } from "@/lib/db";
import crypto from "crypto";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "admin" && session.role !== "manager")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const logs = getPowerLogs(100);
  return NextResponse.json({
    items: logs.map((log) => ({
      id: log.id,
      unitName: log.unitName,
      action: log.action,
      at: log.at,
      user: log.user ?? undefined,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "admin" && session.role !== "manager")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.unitName !== "string" || typeof body.action !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const action = body.action === "on" ? "on" : "off";
  const user = typeof body.user === "string" ? body.user : undefined;
  appendPowerLog({
    id: crypto.randomBytes(8).toString("hex"),
    unitName: body.unitName,
    action,
    at: new Date().toISOString(),
    user,
  });
  return NextResponse.json({ ok: true });
}
