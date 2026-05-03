import crypto from "crypto";
import { readDb,writeDb , TabItem } from "@/lib/db";

export async function loadTabs(): Promise<TabItem[]> {
  const db = readDb();
  return db.tabs.slice();
}

export async function addTab(data: { name: string; active: boolean }): Promise<TabItem> {
  const db = readDb();
  const newTab: TabItem = {
    id: crypto.randomBytes(8).toString("hex"),
    name: data.name,
    active: data.active,
    chillerIds: ""
  };
  db.tabs.push(newTab)
  return newTab;
}

export async function updateTab(id: string, patch: Partial<Pick<TabItem, "name" | "active">>): Promise<TabItem | null> {
  const db = readDb();
  const tabIndex = db.tabs.findIndex((t) => t.id === id);
  if (tabIndex === -1) {
    return null;
  }

  const updatedTab: TabItem = { ...db.tabs[tabIndex] };
  if (typeof patch.name === "string") {
    updatedTab.name = patch.name;
  }
  if (typeof patch.active === "boolean") {
    updatedTab.active = patch.active;
  }

  db.tabs[tabIndex] = updatedTab;
  writeDb(db);
  return updatedTab;
}

export async function deleteTab(id: string): Promise<TabItem | null> {
  const db = readDb();
  const initialLength = db.tabs.length;
  const deletedTab = db.tabs.find((t) => t.id === id);

  db.tabs = db.tabs.filter((t) => t.id !== id);

  if (db.tabs.length === initialLength) {
    return null; // Tab not found
  }
  writeDb(db);
  return deletedTab || null;
}
