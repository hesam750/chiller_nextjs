import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  listActiveChillers,
  upsertChiller,
  createChiller as createChillerDb,
  updateChiller as updateChillerDb,
  deactivateChiller,
} from "@/lib/db";

export type Chiller = {
  id: string;
  name: string;
  ip: string;
  active: boolean;
};

type RawConfig = {
  chillers?: Array<Partial<Chiller>>;
  [key: string]: unknown;
};

function configPath() {
  const base = process.cwd();
  return path.join(base, "..", "assets", "data", "dashboard.config.json");
}

async function seedChillersFromConfig() {
  const existing = listActiveChillers();
  if (existing && existing.length) return;
  let cfg: RawConfig = { chillers: [] };
  try {
    const raw = fs.readFileSync(configPath(), "utf8");
    cfg = JSON.parse(raw) as RawConfig;
  } catch {
    cfg = { chillers: [] };
  }
  const list = Array.isArray(cfg.chillers) ? cfg.chillers : [];
  if (!list.length) {
    return;
  }
  const items: Chiller[] = list.map((c, idx) => ({
    id:
      c.id && String(c.id).trim().length
        ? String(c.id)
        : crypto.randomBytes(8).toString("hex") + "_" + idx,
    name: String(c.name || "بدون نام"),
    ip: String(c.ip || ""),
    active: !!c.active,
  }));
  for (const item of items) {
    upsertChiller(item);
  }
}

export async function loadChillers(): Promise<Chiller[]> {
  await seedChillersFromConfig();
  const rows = listActiveChillers();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    ip: row.ip,
    active: row.active,
  }));
}

export async function addChiller(data: {
  name: string;
  ip: string;
  active: boolean;
}): Promise<Chiller> {
  const row = createChillerDb({
    name: String(data.name || "بدون نام"),
    ip: String(data.ip || ""),
    active: !!data.active,
  });
  return {
    id: row.id,
    name: row.name,
    ip: row.ip,
    active: row.active,
  };
}

export async function updateChiller(
  id: string,
  patch: Partial<Pick<Chiller, "name" | "ip" | "active">>,
): Promise<Chiller | null> {
  const updated = updateChillerDb(id, patch);
  if (!updated) return null;
  return {
    id: updated.id,
    name: updated.name,
    ip: updated.ip,
    active: updated.active,
  };
}

export async function deleteChiller(id: string): Promise<Chiller | null> {
  const updated = deactivateChiller(id);
  if (!updated) return null;
  return {
    id: updated.id,
    name: updated.name,
    ip: updated.ip,
    active: updated.active,
  };
}
