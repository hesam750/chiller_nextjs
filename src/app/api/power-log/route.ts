import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "admin" && session.role !== "manager")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const logs = await prisma.powerLog.findMany({
    orderBy: { at: "desc" },
    take: 100,
  });
  return NextResponse.json({
    items: logs.map((log) => ({
      id: log.id,
      unitName: log.unitName,
      action: log.action,
      at: log.at.toISOString(),
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
  await prisma.powerLog.create({
    data: {
      id: crypto.randomBytes(8).toString("hex"),
      unitName: body.unitName,
      action,
      at: new Date(),
      user,
    },
  });
  return NextResponse.json({ ok: true });
}
