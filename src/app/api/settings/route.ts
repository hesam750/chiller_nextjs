import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getSettings, updateSettings, getEffectiveProgressForChiller, updateChillerProgress, appendActivityLog } from "@/lib/db";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chillerId = searchParams.get("chillerId") || searchParams.get("id");
  if (chillerId && chillerId.trim().length > 0) {
    const e = getEffectiveProgressForChiller(chillerId.trim());
    return NextResponse.json({
      item: {
        progressOnSeconds: e.progressOnSeconds,
        progressOffSeconds: e.progressOffSeconds,
      },
    });
  }
  const s = getSettings();
  return NextResponse.json({
    item: {
      progressOnSeconds: s.progressOnSeconds,
      progressOffSeconds: s.progressOffSeconds,
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "admin" && session.role !== "manager")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const chillerId =
    typeof b.chillerId === "string" ? String(b.chillerId).trim() : "";
  if (chillerId) {
    const progressOnSeconds =
      typeof b.progressOnSeconds === "number"
        ? Math.max(1, Math.round(b.progressOnSeconds))
        : undefined;
    const progressOffSeconds =
      typeof b.progressOffSeconds === "number"
        ? Math.max(1, Math.round(b.progressOffSeconds))
        : undefined;
    updateChillerProgress(chillerId, {
      progressOnSeconds,
      progressOffSeconds,
    });
    const e = getEffectiveProgressForChiller(chillerId);
    if (session && typeof session.username === "string") {
      appendActivityLog({
        id: crypto.randomBytes(8).toString("hex"),
        username: session.username,
        action: "settings.update_chiller",
        at: new Date().toISOString(),
        details: { chillerId, progressOnSeconds, progressOffSeconds },
      });
    }
    return NextResponse.json({
      ok: true,
      item: {
        progressOnSeconds: e.progressOnSeconds,
        progressOffSeconds: e.progressOffSeconds,
      },
    });
  } else {
    const progressOnSeconds =
      typeof b.progressOnSeconds === "number" ? Math.max(1, Math.round(b.progressOnSeconds)) : undefined;
    const progressOffSeconds =
      typeof b.progressOffSeconds === "number" ? Math.max(1, Math.round(b.progressOffSeconds)) : undefined;
    const s = updateSettings({
      progressOnSeconds,
      progressOffSeconds,
    });
    if (session && typeof session.username === "string") {
      appendActivityLog({
        id: crypto.randomBytes(8).toString("hex"),
        username: session.username,
        action: "settings.update_global",
        at: new Date().toISOString(),
        details: { progressOnSeconds, progressOffSeconds },
      });
    }
    return NextResponse.json({
      ok: true,
      item: {
        progressOnSeconds: s.progressOnSeconds,
        progressOffSeconds: s.progressOffSeconds,
      },
    });
  }
}
