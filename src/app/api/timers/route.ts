import { NextRequest, NextResponse } from "next/server";
import {
  addTimer,
  findActiveTimer,
  deactivateTimersForIp,
  dueTimers,
  updateTimer,
} from "@/lib/db";

type TimerItem = {
  id: string;
  chillerName: string;
  chillerIp: string;
  mode: string;
  hours: number;
  targetAt: string;
  active: boolean;
};

const globalForTimers = globalThis as typeof globalThis & {
  timersWorkerStarted?: boolean;
};

async function runDueTimersOnce() {
  const now = new Date();
  const due = dueTimers(now);
  if (!due.length) {
    return;
  }
  const baseUrl = process.env.TIMER_BASE_URL || "http://127.0.0.1:3000";
  for (const item of due as TimerItem[]) {
    try {
      const target = item.mode === "on";
      await fetch(baseUrl + "/api/chiller-control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ip: item.chillerIp,
          kind: "power",
          target,
        }),
      }).catch(() => undefined);
    } catch {
    } finally {
      updateTimer(item.id, { active: false });
    }
  }
}

function ensureTimersWorker() {
  if (globalForTimers.timersWorkerStarted) return;
  globalForTimers.timersWorkerStarted = true;
  const intervalMs = 15000;
  runDueTimersOnce().catch(() => undefined);
  setInterval(() => {
    runDueTimersOnce().catch(() => undefined);
  }, intervalMs);
}

export async function GET(req: NextRequest) {
  ensureTimersWorker();
  const { searchParams } = new URL(req.url);
  const chillerIp = searchParams.get("chillerIp") || searchParams.get("ip");
  if (!chillerIp) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const timer = findActiveTimer(chillerIp);
  if (!timer) {
    return NextResponse.json({ item: null });
  }
  return NextResponse.json({
    item: {
      id: timer.id,
      chillerName: timer.chillerName,
      chillerIp: timer.chillerIp,
      mode: timer.mode,
      hours: timer.hours,
      targetAt: timer.targetAt,
      active: timer.active,
    },
  });
}

export async function DELETE(req: NextRequest) {
  ensureTimersWorker();
  const { searchParams } = new URL(req.url);
  const chillerIp = searchParams.get("chillerIp") || searchParams.get("ip");
  if (!chillerIp) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  deactivateTimersForIp(chillerIp);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  ensureTimersWorker();
  const body = await req.json().catch(() => null);
  console.log('Timer POST request body:', body);
  if (
    !body ||
    typeof body.chillerName !== "string" ||
    typeof body.chillerIp !== "string" ||
    typeof body.mode !== "string" ||
    typeof body.hours !== "number" ||
    typeof body.targetAt !== "string"
  ) {
    console.log('Timer POST validation failed');
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const hours = Number.isFinite(body.hours) ? body.hours : 0;
  if (!hours || hours <= 0) {
    return NextResponse.json({ error: "invalid_hours" }, { status: 400 });
  }
  const target = new Date(body.targetAt);
  if (Number.isNaN(target.getTime())) {
    return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  }
  const timer = addTimer({
    chillerName: body.chillerName,
    chillerIp: body.chillerIp,
    mode: body.mode,
    hours,
    targetAt: target,
  });
  return NextResponse.json({
    ok: true,
    item: {
      id: timer.id,
      chillerName: timer.chillerName,
      chillerIp: timer.chillerIp,
      mode: timer.mode,
      hours: timer.hours,
      targetAt: timer.targetAt,
      active: timer.active,
    },
  });
}
