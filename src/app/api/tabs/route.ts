import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getUser, appendActivityLog } from "@/lib/db";
import { loadTabs, addTab } from "@/lib/tabs";
import crypto from "crypto";

async function requireManageTabs() {
  const s = await getSessionFromCookies();
  if (!s || !s.username) return false;
  if (s.role === "admin") return true; // Admins can manage tabs
  // Add specific permission for managing tabs if needed in the future
  const u = getUser(s.username);
  if (!u) return false;
  // For now, only admins can manage tabs, but a specific permission could be added
  return false;
}

export async function GET() {
  try {
    const items = await loadTabs();
    return NextResponse.json({ items });
  } catch (e) {
    console.error("Error getting tabs:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // if (!(await requireManageTabs())) {
  //   return NextResponse.json({ error: "forbidden" }, { status: 403 });
  // }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.active !== "boolean"
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const newTab = await addTab({
      name: body.name,
      active: body.active,
    });

    const s = await getSessionFromCookies();
    if (s && typeof s.username === "string") {
      appendActivityLog({
        id: crypto.randomBytes(8).toString("hex"),
        username: s.username,
        action: "tab.create",
        at: new Date().toISOString(),
        details: { id: newTab.id, name: newTab.name, active: newTab.active },
      });
    }

    return NextResponse.json({ ok: true, item: newTab });
  } catch (e) {
    console.error("Error creating tab:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}