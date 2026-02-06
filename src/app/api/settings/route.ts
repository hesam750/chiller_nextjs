import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import {
  getSettings,
  updateSettings,
  getEffectiveProgressForChiller,
  updateChillerProgress,
} from "@/lib/db";

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
  const chillerId =
    typeof (body as any).chillerId === "string" ? String((body as any).chillerId).trim() : "";
  if (chillerId) {
    const progressOnSeconds =
      typeof (body as any).progressOnSeconds === "number"
        ? Math.max(1, Math.round((body as any).progressOnSeconds))
        : undefined;
    const progressOffSeconds =
      typeof (body as any).progressOffSeconds === "number"
        ? Math.max(1, Math.round((body as any).progressOffSeconds))
        : undefined;
    const o = updateChillerProgress(chillerId, {
      progressOnSeconds,
      progressOffSeconds,
    });
    const e = getEffectiveProgressForChiller(chillerId);
    return NextResponse.json({
      ok: true,
      item: {
        progressOnSeconds: e.progressOnSeconds,
        progressOffSeconds: e.progressOffSeconds,
      },
    });
  } else {
    const progressOnSeconds =
      typeof (body as any).progressOnSeconds === "number" ? Math.max(1, Math.round((body as any).progressOnSeconds)) : undefined;
    const progressOffSeconds =
      typeof (body as any).progressOffSeconds === "number" ? Math.max(1, Math.round((body as any).progressOffSeconds)) : undefined;
    const s = updateSettings({
      progressOnSeconds,
      progressOffSeconds,
    });
    return NextResponse.json({
      ok: true,
      item: {
        progressOnSeconds: s.progressOnSeconds,
        progressOffSeconds: s.progressOffSeconds,
      },
    });
  }
}
