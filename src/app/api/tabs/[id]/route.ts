import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getUser, appendActivityLog } from "@/lib/db";
import { loadTabs, updateTab, deleteTab } from "@/lib/tabs";
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

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const tabs = await loadTabs();
    const tab = tabs.find((t) => t.id === id);
    if (!tab) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ item: tab });
  } catch (e) {
    console.error("Error getting tab:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  if (!(await requireManageTabs())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = context.params;
  const body = await req.json().catch(() => null);
  if (
    !body ||
    (typeof body.name !== "string" && typeof body.active !== "boolean")
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const updatedTab = await updateTab(id, {
      name: body.name,
      active: body.active,
    });

    if (!updatedTab) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const s = await getSessionFromCookies();
    if (s && typeof s.username === "string") {
      appendActivityLog({
        id: crypto.randomBytes(8).toString("hex"),
        username: s.username,
        action: "tab.update",
        at: new Date().toISOString(),
        details: { id: updatedTab.id, name: updatedTab.name, active: updatedTab.active },
      });
    }

    return NextResponse.json({ ok: true, item: updatedTab });
  } catch (e) {
    console.error("Error updating tab:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  if (!(await requireManageTabs())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = context.params;

  try {
    const deletedTab = await deleteTab(id);

    if (!deletedTab) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const s = await getSessionFromCookies();
    if (s && typeof s.username === "string") {
      appendActivityLog({
        id: crypto.randomBytes(8).toString("hex"),
        username: s.username,
        action: "tab.delete",
        at: new Date().toISOString(),
        details: { id },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error deleting tab:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}