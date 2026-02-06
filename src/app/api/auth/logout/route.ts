import { NextResponse } from "next/server";

export async function POST() {
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
  return res;
}
