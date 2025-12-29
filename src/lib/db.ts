import fs from "fs";
import path from "path";
import crypto from "crypto";

type PowerLog = {
  id: string;
  unitName: string;
  action: "on" | "off";
  at: string;
  user?: string;
};

type UserRole = "admin" | "manager" | "viewer";

type User = {
  username: string;
  passwordHash: string;
  role: UserRole;
};

export type Chiller = {
  id: string;
  name: string;
  ip: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TimerItem = {
  id: string;
  chillerName: string;
  chillerIp: string;
  mode: string;
  hours: number;
  targetAt: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type DbShape = {
  powerLogs: PowerLog[];
  users: User[];
  chillers: Chiller[];
  timers: TimerItem[];
};

function dbFilePath() {
  const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
  const base = isVercel ? process.env.TMPDIR || "/tmp" : process.cwd();
  const dataDir = path.join(base, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "db.json");
}

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function readDb(): DbShape {
  const file = dbFilePath();
  if (!fs.existsSync(file)) {
    const initial: DbShape = {
      powerLogs: [],
      users: [
        {
          username: "admin",
          passwordHash: hashPassword("admin@ch.fanap"),
          role: "admin",
        },
        {
          username: "manager",
          passwordHash: hashPassword("manager@ch.fanap"),
          role: "manager",
        },
        {
          username: "viewer",
          passwordHash: hashPassword("viewer@ch.fanap"),
          role: "viewer",
        },
      ],
      chillers: [],
      timers: [],
    };
    fs.writeFileSync(file, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    const db: DbShape = {
      powerLogs: Array.isArray(parsed.powerLogs) ? parsed.powerLogs : [],
      users: Array.isArray(parsed.users)
        ? parsed.users.map((u) => ({
            username: String(u.username || ""),
            passwordHash: String(u.passwordHash || ""),
            role:
              u.role === "admin"
                ? "admin"
              : u.role === "manager"
                  ? "manager"
                  : "viewer",
          }))
        : [],
      chillers: Array.isArray(parsed.chillers)
        ? parsed.chillers.map((c) => ({
            id: String(c.id || ""),
            name: String(c.name || ""),
            ip: String(c.ip || ""),
            active: !!c.active,
            createdAt: c.createdAt ? String(c.createdAt) : undefined,
            updatedAt: c.updatedAt ? String(c.updatedAt) : undefined,
          }))
        : [],
      timers: Array.isArray(parsed.timers)
        ? parsed.timers.map((t) => ({
            id: String(t.id || ""),
            chillerName: String(t.chillerName || ""),
            chillerIp: String(t.chillerIp || ""),
            mode: String(t.mode || ""),
            hours: Number.isFinite(t.hours as number) ? Number(t.hours) : 0,
            targetAt: String(t.targetAt || ""),
            active: !!t.active,
            createdAt: t.createdAt ? String(t.createdAt) : new Date().toISOString(),
            updatedAt: t.updatedAt ? String(t.updatedAt) : new Date().toISOString(),
          }))
        : [],
    };
    if (!db.users.find((u) => u.username === "admin")) {
      db.users.push({
        username: "admin",
        passwordHash: hashPassword("admin@ch.fanap"),
        role: "admin",
      });
    }
    if (!db.users.find((u) => u.username === "manager")) {
      db.users.push({
        username: "manager",
        passwordHash: hashPassword("manager@ch.fanap"),
        role: "manager",
      });
    }
    if (!db.users.find((u) => u.username === "viewer")) {
      db.users.push({
        username: "viewer",
        passwordHash: hashPassword("viewer@ch.fanap"),
        role: "viewer",
      });
    }
    writeDb(db);
    return db;
  } catch {
    const fallback: DbShape = {
      powerLogs: [],
      users: [
        {
          username: "admin",
          passwordHash: hashPassword("admin@ch.fanap"),
          role: "admin",
        },
        {
          username: "manager",
          passwordHash: hashPassword("manager@ch.fanap"),
          role: "manager",
        },
        {
          username: "viewer",
          passwordHash: hashPassword("viewer@ch.fanap"),
          role: "viewer",
        },
      ],
      chillers: [],
      timers: [],
    };
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

function writeDb(data: DbShape) {
  const file = dbFilePath();
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

export function appendPowerLog(entry: PowerLog) {
  const db = readDb();
  db.powerLogs.unshift(entry);
  const now = Date.now();
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
  db.powerLogs = db.powerLogs.filter((p) => {
    const t = new Date(p.at).getTime();
    return Number.isFinite(t) ? t >= cutoff : true;
  });
  if (db.powerLogs.length > 1000) {
    db.powerLogs = db.powerLogs.slice(0, 1000);
  }
  writeDb(db);
}

export function getPowerLogs(limit = 50): PowerLog[] {
  const db = readDb();
  const now = Date.now();
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
  const list = db.powerLogs.filter((p) => {
    const t = new Date(p.at).getTime();
    return Number.isFinite(t) ? t >= cutoff : true;
  });
  return list.slice(0, limit);
}

export function upsertUser(user: User) {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.username === user.username);
  if (idx === -1) {
    db.users.push(user);
  } else {
    db.users[idx] = user;
  }
  writeDb(db);
}

export function getUser(username: string): User | undefined {
  const db = readDb();
  return db.users.find((u) => u.username === username);
}

export function verifyPassword(username: string, password: string) {
  const user = getUser(username);
  if (!user) return null;
  const hash = hashPassword(password);
  if (hash !== user.passwordHash) return null;
  return user;
}

export function listChillers(): Chiller[] {
  const db = readDb();
  return db.chillers.slice();
}

export function listActiveChillers(): Chiller[] {
  return listChillers().filter((c) => c.active);
}

export function upsertChiller(item: Chiller) {
  const db = readDb();
  const nowIso = new Date().toISOString();
  const idx = db.chillers.findIndex((c) => c.id === item.id);
  if (idx === -1) {
    db.chillers.push({ ...item, createdAt: nowIso, updatedAt: nowIso });
  } else {
    db.chillers[idx] = { ...db.chillers[idx], ...item, updatedAt: nowIso };
  }
  writeDb(db);
}

export function createChiller(data: { name: string; ip: string; active: boolean }): Chiller {
  const id = crypto.randomBytes(8).toString("hex");
  const nowIso = new Date().toISOString();
  const item: Chiller = {
    id,
    name: String(data.name || "بدون نام"),
    ip: String(data.ip || ""),
    active: !!data.active,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const db = readDb();
  db.chillers.push(item);
  writeDb(db);
  return item;
}

export function updateChiller(id: string, patch: Partial<Pick<Chiller, "name" | "ip" | "active">>): Chiller | null {
  const db = readDb();
  const idx = db.chillers.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const nowIso = new Date().toISOString();
  const cur = db.chillers[idx];
  const updated: Chiller = {
    ...cur,
    name: patch.name != null ? String(patch.name || "بدون نام") : cur.name,
    ip: patch.ip != null ? String(patch.ip || "") : cur.ip,
    active: patch.active != null ? !!patch.active : cur.active,
    updatedAt: nowIso,
  };
  db.chillers[idx] = updated;
  writeDb(db);
  return updated;
}

export function deactivateChiller(id: string): Chiller | null {
  const db = readDb();
  const idx = db.chillers.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const nowIso = new Date().toISOString();
  const updated: Chiller = { ...db.chillers[idx], active: false, updatedAt: nowIso };
  db.chillers[idx] = updated;
  writeDb(db);
  return updated;
}

export function findActiveTimer(chillerIp: string): TimerItem | null {
  const db = readDb();
  const t = db.timers.find((x) => x.chillerIp === chillerIp && x.active);
  return t || null;
}

export function addTimer(data: {
  chillerName: string;
  chillerIp: string;
  mode: string;
  hours: number;
  targetAt: Date;
}): TimerItem {
  const nowIso = new Date().toISOString();
  const item: TimerItem = {
    id: crypto.randomBytes(8).toString("hex"),
    chillerName: data.chillerName,
    chillerIp: data.chillerIp,
    mode: data.mode,
    hours: data.hours,
    targetAt: data.targetAt.toISOString(),
    active: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const db = readDb();
  db.timers.push(item);
  writeDb(db);
  return item;
}

export function deactivateTimersForIp(chillerIp: string) {
  const db = readDb();
  const nowIso = new Date().toISOString();
  db.timers = db.timers.map((t) =>
    t.chillerIp === chillerIp && t.active ? { ...t, active: false, updatedAt: nowIso } : t,
  );
  writeDb(db);
}

export function dueTimers(now: Date): TimerItem[] {
  const db = readDb();
  return db.timers.filter((t) => t.active && new Date(t.targetAt).getTime() <= now.getTime());
}

export function updateTimer(id: string, patch: Partial<Pick<TimerItem, "active" | "targetAt" | "mode">>): TimerItem | null {
  const db = readDb();
  const idx = db.timers.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const nowIso = new Date().toISOString();
  const cur = db.timers[idx];
  const updated: TimerItem = {
    ...cur,
    active: patch.active != null ? !!patch.active : cur.active,
    targetAt: patch.targetAt != null ? String(patch.targetAt) : cur.targetAt,
    mode: patch.mode != null ? String(patch.mode) : cur.mode,
    updatedAt: nowIso,
  };
  db.timers[idx] = updated;
  writeDb(db);
  return updated;
}
