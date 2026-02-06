import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { appendActivityLog } from "@/lib/db";
import crypto from "crypto";

export async function POST() {
  const session = await getSessionFromCookies();
  const res = NextResponse.json({ ok: true });
  const secure =
    process.env.COOKIE_SECURE === "1" ||
    process.env.COOKIE_SECURE === "true";
  res.cookies.set("session", "", {
    path: "/",
    maxAge: 0,
    secure,
    httpOnly: true,
    sameSite: "lax",
  });
  if (session && typeof session.username === "string") {
    appendActivityLog({
      id: crypto.randomBytes(8).toString("hex"),
      username: session.username,
      action: "auth.logout",
      at: new Date().toISOString(),
    });
  }
  return res;
}
