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
  const chillerName = searchParams.get("chillerName") || "";
  const action = searchParams.get("action") || "";
  const fromDate = searchParams.get("fromDate") || "";
  const toDate = searchParams.get("toDate") || "";
  const weekday = searchParams.get("weekday") || "";
  const limitStr = searchParams.get("limit") || "";
  const offsetStr = searchParams.get("offset") || "";

  const limit = Math.max(1, Math.min(100, parseInt(limitStr || "20", 10) || 20));
  const offset = Math.max(0, parseInt(offsetStr || "0", 10) || 0);


  let logs = getActivityLogs(10000);

  if (username) {
    logs = logs.filter(l => l.username?.toLowerCase().includes(username.toLowerCase()));
  }

  if (chillerName) {
    logs = logs.filter(l => {
      const details = l.details as any;
      const target = details?.target || details?.name || details?.chillerName || "";
      return target.toLowerCase().includes(chillerName.toLowerCase());
    });
  }

  if (action) {
    logs = logs.filter(l => l.action === action);
  }

  if (fromDate) {
    logs = logs.filter(l => l.at >= fromDate);
  }

  if (toDate) {
    logs = logs.filter(l => l.at <= toDate);
  }

  if (weekday && !isNaN(parseInt(weekday))) {
    logs = logs.filter(l => new Date(l.at).getDay() === parseInt(weekday));
  }


  logs.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const total = logs.length;
  const items = logs.slice(offset, offset + limit);

  return NextResponse.json({
    items: items.map((x) => ({
      id: x.id,
      username: x.username,
      action: x.action,
      at: x.at,
      details: x.details || undefined,
    })),
    total,
    limit,
    offset,
  });
}