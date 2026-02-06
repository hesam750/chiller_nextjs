import { NextRequest, NextResponse } from "next/server";
import { getPowerLogs } from "@/lib/db";
import { loadChillers } from "@/lib/chillers";

function normalizeName(s: string | null | undefined) {
  return String(s || "").trim();
}

function formatSeconds(msDiff: number) {
  if (!Number.isFinite(msDiff) || msDiff <= 0) return 0;
  return Math.floor(msDiff / 1000);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const nameParam = normalizeName(url.searchParams.get("unitName") || url.searchParams.get("name"));
  const ipParam = normalizeName(url.searchParams.get("ip"));

  let unitName = nameParam;
  if (!unitName && ipParam) {
    try {
      const chillers = await loadChillers();
      const found = chillers.find((c) => normalizeName(c.ip) === ipParam);
      if (found) {
        unitName = normalizeName(found.name);
      }
    } catch {
      unitName = "";
    }
  }

  if (!unitName) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const logs = getPowerLogs(1000).filter((l) => normalizeName(l.unitName) === unitName);
  const now = Date.now();
  let lastOnAt: string | null = null;
  let lastOffAt: string | null = null;
  let state: "on" | "off" | "unknown" = "unknown";

  if (logs.length) {
    const sortedAsc = logs.slice().sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const last = sortedAsc[sortedAsc.length - 1];
    state = last.action === "on" ? "on" : "off";
    for (let i = sortedAsc.length - 1; i >= 0; i -= 1) {
      const item = sortedAsc[i];
      if (!lastOnAt && item.action === "on") {
        lastOnAt = item.at;
      }
      if (!lastOffAt && item.action === "off") {
        lastOffAt = item.at;
      }
      if (lastOnAt && lastOffAt) break;
    }
  }

  const lastOnMs = lastOnAt ? new Date(lastOnAt).getTime() : NaN;
  const lastOffMs = lastOffAt ? new Date(lastOffAt).getTime() : NaN;
  const sinceOnSeconds = Number.isFinite(lastOnMs) ? formatSeconds(now - lastOnMs) : null;
  const sinceOffSeconds = Number.isFinite(lastOffMs) ? formatSeconds(now - lastOffMs) : null;

  return NextResponse.json({
    unitName,
    state,
    sinceOnSeconds,
    sinceOffSeconds,
    lastOnAt: lastOnAt || null,
    lastOffAt: lastOffAt || null,
  });
}

