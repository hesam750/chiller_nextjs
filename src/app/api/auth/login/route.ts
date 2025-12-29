import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const user = verifyPassword(body.username, body.password);
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const token = createSession(user.username, user.role);
  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
