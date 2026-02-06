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

type Permissions = {
  canViewTimer?: boolean;
  canControlTimer?: boolean;
  canTogglePower?: boolean;
  canSetTemperature?: boolean;
  canAddPackage?: boolean;
  canManageUsers?: boolean;
  canViewLogs?: boolean;
};

type User = {
  username: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  permissions?: Permissions;
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

export type Settings = {
  progressOnSeconds: number;
  progressOffSeconds: number;
  byChiller?: Record<
    string,
    {
      progressOnSeconds?: number;
      progressOffSeconds?: number;
    }
  >;
};

type DbShape = {
  powerLogs: PowerLog[];
  users: User[];
  chillers: Chiller[];
  timers: TimerItem[];
  settings?: Settings;
};

function projectRootDir() {
  const cwd = process.cwd();
  function hasPkg(dir: string) {
    try {
      const p = path.join(dir, "package.json");
      if (!fs.existsSync(p)) return false;
      const t = fs.readFileSync(p, "utf8");
      try {
        const j = JSON.parse(t) as { name?: string };
        const n = j && j.name ? String(j.name) : "";
        return !!n;
      } catch {
        return true;
      }
    } catch {
      return false;
    }
  }
  const candidates = [
    cwd,
    path.resolve(cwd, ".."),
    path.resolve(cwd, "../.."),
    path.resolve(cwd, "../../.."),
  ];
  for (const d of candidates) {
    if (hasPkg(d)) return d;
  }
  return cwd;
}

function dbFilePath() {
  const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
  const override = process.env.CHILLER_DATA_DIR;
  const base = isVercel
    ? process.env.TMPDIR || "/tmp"
    : override && override.trim().length
      ? override
      : projectRootDir();
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
          active: true,
        },
        {
          username: "manager",
          passwordHash: hashPassword("manager@ch.fanap"),
          role: "manager",
          active: true,
        },
        {
          username: "viewer",
          passwordHash: hashPassword("viewer@ch.fanap"),
          role: "viewer",
          active: true,
        },
      ],
      chillers: [],
      timers: [],
      settings: {
        progressOnSeconds: 60,
        progressOffSeconds: 60,
      },
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
            active: u.active === false ? false : true,
            permissions: {
              canViewTimer:
                u && u.permissions && typeof u.permissions.canViewTimer === "boolean"
                  ? u.permissions.canViewTimer
                  : undefined,
              canControlTimer:
                u && u.permissions && typeof u.permissions.canControlTimer === "boolean"
                  ? u.permissions.canControlTimer
                  : undefined,
              canTogglePower:
                u && u.permissions && typeof u.permissions.canTogglePower === "boolean"
                  ? u.permissions.canTogglePower
                  : undefined,
              canSetTemperature:
                u && u.permissions && typeof u.permissions.canSetTemperature === "boolean"
                  ? u.permissions.canSetTemperature
                  : undefined,
              canAddPackage:
                u && u.permissions && typeof u.permissions.canAddPackage === "boolean"
                  ? u.permissions.canAddPackage
                  : undefined,
              canManageUsers:
                u && u.permissions && typeof u.permissions.canManageUsers === "boolean"
                  ? u.permissions.canManageUsers
                  : undefined,
              canViewLogs:
                u && u.permissions && typeof u.permissions.canViewLogs === "boolean"
                  ? u.permissions.canViewLogs
                  : undefined,
            },
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
      settings: {
        progressOnSeconds:
          parsed.settings && typeof (parsed.settings as any).progressOnSeconds === "number"
            ? Math.max(1, Math.round((parsed.settings as any).progressOnSeconds))
            : 60,
        progressOffSeconds:
          parsed.settings && typeof (parsed.settings as any).progressOffSeconds === "number"
            ? Math.max(1, Math.round((parsed.settings as any).progressOffSeconds))
            : 60,
        byChiller:
          parsed.settings && parsed.settings && typeof (parsed.settings as any).byChiller === "object"
            ? Object.fromEntries(
                Object.entries((parsed.settings as any).byChiller || {}).map(([k, v]) => [
                  String(k),
                  {
                    progressOnSeconds:
                      v && typeof (v as any).progressOnSeconds === "number"
                        ? Math.max(1, Math.round((v as any).progressOnSeconds))
                        : undefined,
                    progressOffSeconds:
                      v && typeof (v as any).progressOffSeconds === "number"
                        ? Math.max(1, Math.round((v as any).progressOffSeconds))
                        : undefined,
                  },
                ]),
              )
            : {},
      },
    };
    if (!db.users.find((u) => u.username === "admin")) {
      db.users.push({
        username: "admin",
        passwordHash: hashPassword("admin@ch.fanap"),
        role: "admin",
        active: true,
        permissions: {
          canViewTimer: true,
          canControlTimer: true,
          canTogglePower: true,
          canSetTemperature: true,
          canAddPackage: true,
          canManageUsers: false,
          canViewLogs: true,
        },
      });
    }
    if (!db.users.find((u) => u.username === "manager")) {
      db.users.push({
        username: "manager",
        passwordHash: hashPassword("manager@ch.fanap"),
        role: "manager",
        active: true,
        permissions: {
          canViewTimer: true,
          canControlTimer: true,
          canTogglePower: true,
          canSetTemperature: true,
          canAddPackage: false,
          canManageUsers: true,
          canViewLogs: true,
        },
      });
    }
    if (!db.users.find((u) => u.username === "viewer")) {
      db.users.push({
        username: "viewer",
        passwordHash: hashPassword("viewer@ch.fanap"),
        role: "viewer",
        active: true,
        permissions: {
          canViewTimer: true,
          canControlTimer: false,
          canTogglePower: false,
          canSetTemperature: false,
          canAddPackage: false,
          canManageUsers: false,
          canViewLogs: false,
        },
      });
    }
    if (!db.users.find((u) => u.username === "حمیدرضا سعدی")) {
      db.users.push({
        username: "حمیدرضا سعدی",
        passwordHash: hashPassword("manager@ch.fanap"),
        role: "manager",
        active: true,
      });
    }
    if (!db.users.find((u) => u.username === "حسین کارجو")) {
      db.users.push({
        username: "حسین کارجو",
        passwordHash: hashPassword("admin@ch.fanap"),
        role: "admin",
        active: true,
      });
    }
    if (!db.users.find((u) => u.username === "ابراهیم رضایی")) {
      db.users.push({
        username: "ابراهیم رضایی",
        passwordHash: hashPassword("admin@ch.fanap"),
        role: "admin",
        active: true,
      });
    }
    if (!db.users.find((u) => u.username === "محمد بیننده")) {
      db.users.push({
        username: "محمد بیننده",
        passwordHash: hashPassword("viewer@ch.fanap"),
        role: "viewer",
        active: true,
      });
    }
    if (!db.users.find((u) => u.username === "سید طاهر محمدی")) {
      db.users.push({
        username: "سید طاهر محمدی",
        passwordHash: hashPassword("viewer@ch.fanap"),
        role: "viewer",
        active: true,
      });
    }
    if (!db.users.find((u) => u.username === "محمدعلی رضایی")) {
      db.users.push({
        username: "محمدعلی رضایی",
        passwordHash: hashPassword("viewer@ch.fanap"),
        role: "viewer",
        active: true,
      });
    }
    writeDb(db);
    return db;
  } catch (error: any) {
    // Prevent resetting the DB on transient errors like file locking (EBUSY)
    if (error.code === "EBUSY" || error.code === "EPERM") {
      console.error("Database busy, skipping read...");
      throw error;
    }
    
    console.error("Database read error, checking if reset is needed:", error);
    
    // Only reset if it's a syntax error (corruption)
    if (!(error instanceof SyntaxError)) {
       throw error;
    }

    console.warn("Database corrupted (SyntaxError). Backing up and resetting.");
    try {
      if (fs.existsSync(file)) {
        fs.copyFileSync(file, file + ".bak-" + Date.now());
      }
    } catch (e) {
      console.error("Failed to backup corrupted DB:", e);
    }

    const fallback: DbShape = {
      powerLogs: [],
      users: [
        {
          username: "admin",
          passwordHash: hashPassword("admin@ch.fanap"),
          role: "admin",
          active: true,
          permissions: {
            canViewTimer: true,
            canControlTimer: true,
            canTogglePower: true,
            canSetTemperature: true,
            canAddPackage: true,
            canManageUsers: false,
            canViewLogs: true,
          },
        },
        {
          username: "manager",
          passwordHash: hashPassword("manager@ch.fanap"),
          role: "manager",
          active: true,
          permissions: {
            canViewTimer: true,
            canControlTimer: true,
            canTogglePower: true,
            canSetTemperature: true,
            canAddPackage: false,
            canManageUsers: true,
            canViewLogs: true,
          },
        },
        {
          username: "viewer",
          passwordHash: hashPassword("viewer@ch.fanap"),
          role: "viewer",
          active: true,
          permissions: {
            canViewTimer: true,
            canControlTimer: false,
            canTogglePower: false,
            canSetTemperature: false,
            canAddPackage: false,
            canManageUsers: false,
            canViewLogs: false,
          },
        },
      ],
      chillers: [],
      timers: [],
      settings: {
        progressOnSeconds: 60,
        progressOffSeconds: 60,
        byChiller: {},
      },
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

export function deleteUser(username: string) {
  const db = readDb();
  db.users = db.users.filter((u) => u.username !== username);
  writeDb(db);
}

export function verifyPassword(username: string, password: string) {
  const user = getUser(username);
  if (!user) return null;
  if (user.active === false) return null;
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

export function listUsers(): Array<{ username: string; role: UserRole; active: boolean; permissions?: Permissions }> {
  const db = readDb();
  return db.users.map((u) => ({
    username: u.username,
    role: u.role,
    active: u.active !== false,
    permissions: u.permissions,
  }));
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

export function getSettings(): Settings {
  const db = readDb();
  const s = db.settings || { progressOnSeconds: 60, progressOffSeconds: 60, byChiller: {} };
  return {
    progressOnSeconds: Math.max(1, Math.round(s.progressOnSeconds || 60)),
    progressOffSeconds: Math.max(1, Math.round(s.progressOffSeconds || 60)),
    byChiller: s.byChiller || {},
  };
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const db = readDb();
  const cur = db.settings || { progressOnSeconds: 60, progressOffSeconds: 60, byChiller: {} };
  const next: Settings = {
    progressOnSeconds:
      typeof patch.progressOnSeconds === "number"
        ? Math.max(1, Math.round(patch.progressOnSeconds))
        : Math.max(1, Math.round(cur.progressOnSeconds || 60)),
    progressOffSeconds:
      typeof patch.progressOffSeconds === "number"
        ? Math.max(1, Math.round(patch.progressOffSeconds))
        : Math.max(1, Math.round(cur.progressOffSeconds || 60)),
    byChiller: cur.byChiller || {},
  };
  db.settings = next;
  writeDb(db);
  return next;
}

export function getChillerProgress(chillerId: string): {
  progressOnSeconds?: number;
  progressOffSeconds?: number;
} {
  const db = readDb();
  const s = db.settings || { progressOnSeconds: 60, progressOffSeconds: 60, byChiller: {} };
  const v = (s.byChiller || {})[chillerId] || {};
  return {
    progressOnSeconds:
      typeof v.progressOnSeconds === "number"
        ? Math.max(1, Math.round(v.progressOnSeconds))
        : undefined,
    progressOffSeconds:
      typeof v.progressOffSeconds === "number"
        ? Math.max(1, Math.round(v.progressOffSeconds))
        : undefined,
  };
}

export function updateChillerProgress(
  chillerId: string,
  patch: Partial<{ progressOnSeconds: number; progressOffSeconds: number }>,
): { progressOnSeconds?: number; progressOffSeconds?: number } {
  const db = readDb();
  if (!db.settings) {
    db.settings = { progressOnSeconds: 60, progressOffSeconds: 60, byChiller: {} };
  }
  if (!db.settings.byChiller) {
    db.settings.byChiller = {};
  }
  const cur = db.settings.byChiller[chillerId] || {};
  const next = {
    progressOnSeconds:
      typeof patch.progressOnSeconds === "number"
        ? Math.max(1, Math.round(patch.progressOnSeconds))
        : cur.progressOnSeconds,
    progressOffSeconds:
      typeof patch.progressOffSeconds === "number"
        ? Math.max(1, Math.round(patch.progressOffSeconds))
        : cur.progressOffSeconds,
  };
  db.settings.byChiller[chillerId] = next;
  writeDb(db);
  return next;
}

export function getEffectiveProgressForChiller(chillerId: string): {
  progressOnSeconds: number;
  progressOffSeconds: number;
} {
  const global = getSettings();
  const override = getChillerProgress(chillerId);
  return {
    progressOnSeconds:
      typeof override.progressOnSeconds === "number"
        ? override.progressOnSeconds
        : global.progressOnSeconds,
    progressOffSeconds:
      typeof override.progressOffSeconds === "number"
        ? override.progressOffSeconds
        : global.progressOffSeconds,
  };
}
