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

type DbShape = {
  powerLogs: PowerLog[];
  users: User[];
};

function dbFilePath() {
  const base = process.cwd();
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
  db.powerLogs = db.powerLogs.slice(0, 500);
  writeDb(db);
}

export function getPowerLogs(limit = 50): PowerLog[] {
  const db = readDb();
  return db.powerLogs.slice(0, limit);
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
