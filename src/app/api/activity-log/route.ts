import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getActivityLogs } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "manager" && session.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username") || "";
  const limitStr = searchParams.get("limit") || "";
  const limit = Math.max(1, Math.min(2000, parseInt(limitStr || "500", 10) || 500));
  const items = getActivityLogs(limit, username || undefined);
  return NextResponse.json({
    items: items.map((x) => ({
      id: x.id,
      username: x.username,
      action: x.action,
      at: x.at,
      details: x.details || undefined,
    })),
  });
}
