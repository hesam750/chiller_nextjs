import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSessionFromCookies } from "@/lib/auth";

type VarsConfig = {
  PowerCmd?: string;
  ModeCmd?: string;
  TempCurrent?: string;
  TempReturn?: string;
  TempSetpoint?: string;
  PowerFb?: string;
  FanSpeedFb?: string;
  AlarmActive?: string;
  ModeFb?: string;
};

function loadVarsConfig(): VarsConfig {
  try {
    const base = process.cwd();
    const cfgPath = path.join(base, "..", "assets", "data", "dashboard.config.json");
    const raw = fs.readFileSync(cfgPath, "utf8");
    const json = JSON.parse(raw) as {
      units?: Array<{ vars?: VarsConfig }>;
    };
    const first = Array.isArray(json.units) && json.units.length ? json.units[0] : undefined;
    const vars = (first && first.vars) || {};
    return {
      PowerCmd: typeof vars.PowerCmd === "string" ? vars.PowerCmd : "SystemStatus.Ctrl",
      ModeCmd: typeof vars.ModeCmd === "string" ? vars.ModeCmd : "SetTyp",
      TempCurrent: typeof vars.TempCurrent === "string" ? vars.TempCurrent : "ReturnTemp.ReadVal",
      TempReturn: typeof vars.TempReturn === "string" ? vars.TempReturn : "ReturnTemp.ReadVal",
      TempSetpoint: typeof vars.TempSetpoint === "string" ? vars.TempSetpoint : "CurrRoomTempSetP_Val",
      PowerFb: typeof vars.PowerFb === "string" ? vars.PowerFb : "SystemStatus.Ctrl",
      FanSpeedFb:
        typeof vars.FanSpeedFb === "string"
          ? vars.FanSpeedFb
          : "MB_Devices.FanElectricalInfo_ZA_1.Modulation",
      AlarmActive: typeof vars.AlarmActive === "string" ? vars.AlarmActive : "Al03_PWRP_1.Active",
      ModeFb: typeof vars.ModeFb === "string" ? vars.ModeFb : "SetTyp",
    };
  } catch {
    return {
      PowerCmd: "SystemStatus.Ctrl",
      ModeCmd: "SetTyp",
      TempCurrent: "ReturnTemp.ReadVal",
      TempReturn: "ReturnTemp.ReadVal",
      TempSetpoint: "CurrRoomTempSetP_Val",
      PowerFb: "SystemStatus.Ctrl",
      FanSpeedFb: "MB_Devices.FanElectricalInfo_ZA_1.Modulation",
      AlarmActive: "Al03_PWRP_1.Active",
      ModeFb: "SetTyp",
    };
  }
}

type DeviceCacheEntry = {
  value: string | null;
  fetchedAt: number;
  pending?: Promise<string | null>;
};

const deviceCache = new Map<string, DeviceCacheEntry>();
const DEVICE_CACHE_TTL_MS = 5000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

type DeviceQueueEntry = Promise<void>;

const deviceQueues = new Map<string, DeviceQueueEntry>();

async function runDeviceRequest<T>(ip: string, fn: () => Promise<T>): Promise<T> {
  const key = ip.trim();
  if (!key) {
    return fn();
  }
  const prev = deviceQueues.get(key) || Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  deviceQueues.set(key, prev.then(() => current));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (deviceQueues.get(key) === current) {
      deviceQueues.delete(key);
    }
  }
}

type VarRow = {
  name: string;
  value: string;
};

function parseVarsTable(html: string): VarRow[] {
  const rows: VarRow[] = [];
  try {
    const t = String(html || "");
    const tableMatch =
      t.match(/<table[^>]*id=["']?varsTable["']?[^>]*>[\s\S]*?<\/table>/i) ||
      t.match(/<table[^>]*>[\s\S]*?<\/table>/i);
    if (!tableMatch) return rows;
    const tbodyMatch = tableMatch[0].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    const body = tbodyMatch ? tbodyMatch[1] : tableMatch[0];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tr: RegExpExecArray | null;
    while ((tr = trRe.exec(body))) {
      const tds: string[] = [];
      let m: RegExpExecArray | null;
      tdRe.lastIndex = 0;
      // eslint-disable-next-line no-cond-assign
      while ((m = tdRe.exec(tr[1]))) {
        const txt = m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
        if (txt !== "") tds.push(txt);
      }
      if (tds.length) {
        const name = (tds[1] || tds[0] || "").trim();
        const value = (tds[3] || tds[2] || tds[1] || "").trim();
        if (name) {
          rows.push({ name, value });
        }
      }
    }
  } catch {
  }
  return rows;
}

function parseVarsCsv(text: string): VarRow[] {
  try {
    const out: VarRow[] = [];
    const t = String(text || "");
    if (!t.trim()) return out;
    const tt = t.trim();
    if (tt[0] === "<" || /<table/i.test(tt)) return out;
    const firstLine = t.split(/\r?\n/)[0] || "";
    let cntComma = 0;
    let cntSemi = 0;
    for (let i = 0; i < firstLine.length; i += 1) {
      const c = firstLine[i];
      if (c === ",") cntComma += 1;
      else if (c === ";") cntSemi += 1;
    }
    const delimiter = cntSemi > cntComma ? ";" : ",";
    const lines = t.trim().split(/\r?\n/);
    if (lines.length <= 1) return out;
    const header = lines[0].split(delimiter);
    const idx: Record<string, number> = {};
    header.forEach((h, i) => {
      idx[String(h || "").trim().toLowerCase()] = i;
    });
    function unq(s: string | undefined) {
      return String(s == null ? "" : s).replace(/^"(.*)"$/, "$1");
    }
    function splitSmart(line: string, delim: string) {
      const res: string[] = [];
      let cur = "";
      let inQ = false;
      const L = line.length;
      for (let j = 0; j < L; j += 1) {
        const ch = line[j];
        if (ch === '"') {
          if (inQ && j + 1 < L && line[j + 1] === '"') {
            cur += '"';
            j += 1;
          } else {
            inQ = !inQ;
          }
        } else if (ch === delim && !inQ) {
          res.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      res.push(cur);
      return res;
    }
    for (let i = 1; i < lines.length; i += 1) {
      const cols = splitSmart(lines[i], delimiter);
      const name = unq(cols[idx.name]);
      if (name) {
        const val = unq(cols[idx.val] ?? cols[idx.value]);
        out.push({ name, value: val });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function parseResponse(text: string): VarRow[] {
  const t = String(text || "");
  const tt = t.trim();
  if (tt[0] === "<" || /<table/i.test(tt)) return parseVarsTable(t);
  if (/^\s*name\s*[,;]\s*id\s*[,;]\s*desc\s*[,;]\s*type\s*[,;]\s*access\s*[,;]\s*val/i.test(t)) {
    return parseVarsCsv(t);
  }
  const csv = parseVarsCsv(t);
  if (csv && csv.length) return csv;
  return parseVarsTable(t);
}

async function fetchDeviceText(ip: string): Promise<string | null> {
  const key = ip.trim();
  if (!key) return null;
  const now = Date.now();
  const cached = deviceCache.get(key);
  if (cached) {
    const age = now - cached.fetchedAt;
    if (cached.pending) {
      return cached.pending;
    }
    if (age < DEVICE_CACHE_TTL_MS) {
      return cached.value;
    }
  }
  const promise = runDeviceRequest(key, async () => {
    const urls = [`http://${key}/getvar.csv`, `http://${key}/vars.htm`];
    for (const url of urls) {
      try {
        const res = await fetchWithTimeout(
          url,
          {
            method: "GET",
            cache: "no-store",
          },
          4000,
        );
        if (res.ok) {
          const text = await res.text();
          return text;
        }
      } catch {
      }
    }
    return null;
  });
  deviceCache.set(key, { value: null, fetchedAt: now, pending: promise });
  const text = await promise;
  deviceCache.set(key, { value: text, fetchedAt: Date.now() });
  return text;
}

async function batchRead(ip: string, keys: string[]): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  const list = Array.from(new Set(keys.filter(Boolean)));
  list.forEach((k) => {
    out[k] = null;
  });
  if (!list.length) return out;
  const text = await fetchDeviceText(ip);
  if (!text) return out;
  const rows = parseResponse(text);
  const idx: Record<string, string> = {};
  rows.forEach((r) => {
    const n = String(r.name || "").trim();
    if (n) idx[n] = String(r.value ?? "");
  });
  list.forEach((k) => {
    const n = String(k || "").trim();
    if (n && Object.prototype.hasOwnProperty.call(idx, n)) {
      out[k] = idx[n];
    }
  });
  return out;
}

async function readVar(ip: string, name: string): Promise<string | null> {
  const map = await batchRead(ip, [name]);
  return map[name] ?? null;
}

async function writeVar(ip: string, name: string, value: string | number): Promise<boolean> {
  return runDeviceRequest(ip, async () => {
    const v = String(value);
    const deviceUrl = `http://${ip}/getvar.csv`;
    let primary: string;
    try {
      if (/getvar\.csv/i.test(deviceUrl)) primary = deviceUrl.replace(/getvar\.csv/i, "setvar.csv");
      else if (/vars\.htm/i.test(deviceUrl)) primary = deviceUrl.replace(/vars\.htm/i, "setvar.csv");
      else {
        const u0 = new URL(deviceUrl);
        primary = u0.origin + u0.pathname.replace(/[^/]+$/, "") + "setvar.csv";
      }
    } catch {
      primary = deviceUrl.replace(/[^/]+$/, "setvar.csv");
    }

    let bases: string[] = [];
    try {
      const u = new URL(deviceUrl);
      const origin = u.origin;
      const dir = u.pathname.replace(/[^/]+$/, "");
      bases = [
        primary,
        origin + dir + "setvar.csv",
        origin + "/setvar.csv",
        origin + "/pgd/setvar.csv",
        origin + "/http/setvar.csv",
        origin + "/pgd/http/setvar.csv",
      ];
      if (/getvar\.csv/i.test(deviceUrl)) bases.push(deviceUrl.replace(/getvar\.csv/i, "setvar.csv"));
      if (/vars\.htm/i.test(deviceUrl)) bases.push(deviceUrl.replace(/vars\.htm/i, "setvar.csv"));
      bases = bases.filter(Boolean).filter((val, idx, arr) => arr.indexOf(val) === idx);
    } catch {
      bases = [primary];
    }

    for (const base of bases) {
      const getAttempts = [
        base + "?" + encodeURIComponent(name) + "=" + encodeURIComponent(v),
        base + "?name=" + encodeURIComponent(name) + "&value=" + encodeURIComponent(v),
        base + "?name=" + encodeURIComponent(name) + "&val=" + encodeURIComponent(v),
        base + "?id=" + encodeURIComponent(name) + "&value=" + encodeURIComponent(v),
        base + "?var=" + encodeURIComponent(name) + "&val=" + encodeURIComponent(v),
      ];
      const postBodies = [
        "name=" + encodeURIComponent(name) + "&value=" + encodeURIComponent(v),
        "name=" + encodeURIComponent(name) + "&val=" + encodeURIComponent(v),
        "id=" + encodeURIComponent(name) + "&value=" + encodeURIComponent(v),
        "var=" + encodeURIComponent(name) + "&val=" + encodeURIComponent(v),
      ];

      for (const url of getAttempts) {
        try {
          const res = await fetchWithTimeout(
            url,
            {
              method: "GET",
              cache: "no-store",
            },
            8000,
          );
          if (res.ok) return true;
        } catch {
        }
      }

      for (const body of postBodies) {
        try {
          const res = await fetchWithTimeout(
            base,
            {
              method: "POST",
              cache: "no-store",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body,
            },
            8000,
          );
          if (res.ok) return true;
        } catch {
        }
      }
    }

    return false;
  });
}

function toBool(v: unknown): boolean {
  if (v == null) return false;
  const n = Number(v);
  if (!Number.isNaN(n)) return n > 0;
  const s = String(v).toLowerCase();
  return (
    s === "1" ||
    s === "on" ||
    s === "true" ||
    s === "running" ||
    s === "active" ||
    s === "enabled"
  );
}

function toNum(v: unknown): number {
  const s = String(v == null ? "" : v).replace(",", ".");
  const m = s.match(/-?\d+(?:\.\d+)?/);
  const n = m ? parseFloat(m[0]) : NaN;
  return Number.isNaN(n) ? NaN : n;
}

function clamp(v: number, mn: number, mx: number): number {
  if (Number.isNaN(v)) return mn;
  return Math.max(mn, Math.min(mx, v));
}

async function applySetpoint(ip: string, varsCfg: VarsConfig, desired: number) {
  const v = clamp(desired, 0, 50);
  const varName = varsCfg.TempSetpoint || "CurrRoomTempSetP_Val";
  const targetVars: string[] = [];
  if (varName) targetVars.push(varName);
  try {
    const useModeSpecific =
      /CurrRoomTempSetP/i.test(varName) || varName === "CurrRoomTempSetP_Val";
    if (useModeSpecific) {
      targetVars.unshift("UnitSetP.RoomTempSetP.Comfort");
    }
  } catch {
  }
  const unlockVars = ["PwdUser", "PwdService", "PwdManuf"];
  const unlockCodes = ["1489", "1234"];
  const desiredDot = v.toFixed(1);
  const desiredComma = desiredDot.replace(".", ",");
  function delay(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  async function readbackAny() {
    try {
      const primary = await readVar(ip, varName);
      if (primary != null) {
        const num = toNum(primary);
        if (!Number.isNaN(num)) return num;
      }
    } catch {
    }
    const reads = targetVars.map(async (n) => {
      try {
        const rv = await readVar(ip, n);
        const num = toNum(rv);
        return { name: n, num };
      } catch {
        return { name: n, num: NaN };
      }
    });
    const arr = await Promise.all(reads);
    const any = arr.find((o) => !Number.isNaN(o.num));
    return any ? any.num : NaN;
  }
  async function trySetAll(valueStr: string) {
    for (const n of targetVars) {
      try {
        await writeVar(ip, n, valueStr);
      } catch {
      }
    }
    await delay(700);
    try {
      const num = await readbackAny();
      if (!Number.isNaN(num) && Math.abs(num - v) <= 0.15) {
        return { ok: true, actual: num };
      }
      return { ok: false, actual: num };
    } catch {
      return { ok: false, actual: NaN };
    }
  }
  async function tryWriteWithFallbacks() {
    const res = await trySetAll(desiredDot);
    if (res && res.ok) return res;
    return trySetAll(desiredComma);
  }
  async function tryUnlockThenWrite() {
    const seq: Array<[string, string]> = [];
    unlockVars.forEach((u) => {
      unlockCodes.forEach((c) => {
        seq.push([u, c]);
      });
    });
    let idx = 0;
    async function next(): Promise<{ ok: boolean; actual: number }> {
      if (idx >= seq.length) return { ok: false, actual: NaN };
      const pair = seq[idx];
      idx += 1;
      try {
        await writeVar(ip, pair[0], pair[1]);
      } catch {
      }
      await delay(600);
      const res = await tryWriteWithFallbacks();
      if (res && res.ok) {
        try {
          await writeVar(ip, pair[0], "0");
        } catch {
        }
        return res;
      }
      return next();
    }
    return next();
  }
  const first = await tryWriteWithFallbacks();
  if (first && first.ok) return first;
  return tryUnlockThenWrite();
}

async function readStatus(ip: string, varsCfg: VarsConfig) {
  const tempCurrentCandidates: string[] = [];
  if (varsCfg.TempCurrent) tempCurrentCandidates.push(varsCfg.TempCurrent);
  tempCurrentCandidates.push(
    "CurrRoomTemp_Val",
    "RoomTempAct_Val",
    "RoomTemp.ReadVal",
    "SupplyTemp.ReadVal",
    "ReturnTemp.ReadVal",
  );
  const keys: string[] = [];
  if (varsCfg.PowerFb) keys.push(varsCfg.PowerFb);
  if (varsCfg.FanSpeedFb) keys.push(varsCfg.FanSpeedFb);
  if (varsCfg.TempReturn) keys.push(varsCfg.TempReturn);
  if (varsCfg.ModeFb) keys.push(varsCfg.ModeFb);
  if (varsCfg.AlarmActive) keys.push(varsCfg.AlarmActive);
  if (varsCfg.TempSetpoint) keys.push(varsCfg.TempSetpoint);
  keys.push("UnitSetP.RoomTempSetP.Comfort");
  tempCurrentCandidates.forEach((k) => {
    keys.push(k);
  });
  const pollKeys = Array.from(new Set(keys.filter(Boolean)));
  const resp = await batchRead(ip, pollKeys);
  const powerFbRaw = varsCfg.PowerFb ? resp[varsCfg.PowerFb] : null;
  const fanSpeedRaw = varsCfg.FanSpeedFb ? resp[varsCfg.FanSpeedFb] : null;
  const powerFb = powerFbRaw != null ? toBool(powerFbRaw) : false;
  const fanSpeed = fanSpeedRaw != null ? toNum(fanSpeedRaw) || 0 : 0;
  let tcRaw: unknown = null;
  if (varsCfg.TempCurrent && Object.prototype.hasOwnProperty.call(resp, varsCfg.TempCurrent)) {
    tcRaw = resp[varsCfg.TempCurrent];
  }
  if (tcRaw == null || String(tcRaw).trim() === "") {
    tempCurrentCandidates.some((k) => {
      if (Object.prototype.hasOwnProperty.call(resp, k)) {
        const v = resp[k];
        if (v != null && String(v).trim() !== "") {
          tcRaw = v;
          return true;
        }
      }
      return false;
    });
  }
  let tempCurrent: number | null = null;
  if (tcRaw != null && String(tcRaw).trim() !== "") {
    const n = toNum(tcRaw);
    if (!Number.isNaN(n)) tempCurrent = parseFloat(n.toFixed(1));
  }
  let tempReturn: number | null = null;
  if (varsCfg.TempReturn && Object.prototype.hasOwnProperty.call(resp, varsCfg.TempReturn)) {
    const n = toNum(resp[varsCfg.TempReturn]);
    if (!Number.isNaN(n)) tempReturn = parseFloat(n.toFixed(1));
  }
  let mode: string | null = null;
  if (varsCfg.ModeFb && Object.prototype.hasOwnProperty.call(resp, varsCfg.ModeFb)) {
    const raw = resp[varsCfg.ModeFb];
    const vv = toNum(raw);
    if (!Number.isNaN(vv)) {
      if (vv === 0) mode = "off";
      else if (vv === 1) mode = "precomfort";
      else if (vv === 2) mode = "economy";
      else if (vv === 3) mode = "comfort";
      else mode = String(raw ?? "");
    } else {
      mode = String(raw ?? "");
    }
  }
  const alarmActive =
    varsCfg.AlarmActive && Object.prototype.hasOwnProperty.call(resp, varsCfg.AlarmActive)
      ? toBool(resp[varsCfg.AlarmActive])
      : false;
  let sp: number | null = null;
  if (varsCfg.TempSetpoint && Object.prototype.hasOwnProperty.call(resp, varsCfg.TempSetpoint)) {
    const n = toNum(resp[varsCfg.TempSetpoint]);
    if (!Number.isNaN(n)) sp = n;
  }
  if (
    (sp == null || Number.isNaN(sp)) &&
    Object.prototype.hasOwnProperty.call(resp, "UnitSetP.RoomTempSetP.Comfort")
  ) {
    const n = toNum(resp["UnitSetP.RoomTempSetP.Comfort"]);
    if (!Number.isNaN(n)) sp = n;
  }
  let setpoint: number | null = null;
  if (sp != null && !Number.isNaN(sp)) {
    setpoint = parseFloat(sp.toFixed(1));
  }
  return {
    ok: true,
    power: !!(powerFb || fanSpeed > 0),
    tempCurrent,
    tempReturn,
    setpoint,
    fanSpeed,
    alarmActive,
    mode,
  };
}

export async function GET(req: NextRequest) {
  const ip = req.nextUrl.searchParams.get("ip")?.trim();

  if (!ip) {
    return NextResponse.json(
      { reachable: false, error: "missing_ip" },
      { status: 400 },
    );
  }

  try {
    const text = await fetchDeviceText(ip);
    const reachable = text != null;
    return NextResponse.json({ reachable });
  } catch {
    return NextResponse.json({ reachable: false });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const session = await getSessionFromCookies();
  if (!session || (session.role !== "admin" && session.role !== "manager")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const ip = typeof body.ip === "string" ? body.ip.trim() : "";
  const kind = typeof body.kind === "string" ? body.kind : "";

  if (!ip || !kind) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const varsCfg = loadVarsConfig();

  if (kind === "power") {
    const target = !!body.target;
    const powerVar = varsCfg.PowerCmd || "SystemStatus.Ctrl";
    const modeVar = varsCfg.ModeCmd || "SetTyp";

    let ok = false;

    if (target) {
      if (modeVar) {
        try {
          await writeVar(ip, modeVar, 3);
        } catch {
        }
      }
      ok = await writeVar(ip, powerVar, 1);
    } else {
      ok = await writeVar(ip, powerVar, 0);
      if (modeVar) {
        try {
          await writeVar(ip, modeVar, 0);
        } catch {
        }
      }
    }

    if (!ok) {
      return NextResponse.json({ ok: false, error: "write_failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  if (kind === "mode") {
    const m = typeof body.mode === "string" ? body.mode.toLowerCase() : "";
    let code = 0;
    if (m === "precomfort" || m === "pre") code = 1;
    else if (m === "economy" || m === "eco") code = 2;
    else if (m === "comfort") code = 3;
    const varName = varsCfg.ModeCmd || "SetTyp";
    const ok = await writeVar(ip, varName, code);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "write_failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  if (kind === "setpoint") {
    const valueRaw =
      typeof body.value === "number"
        ? body.value
        : typeof body.value === "string"
          ? Number(body.value)
          : typeof body.temp === "number"
            ? body.temp
            : typeof body.setpoint === "number"
              ? body.setpoint
              : NaN;
    const v = Number(valueRaw);
    if (Number.isNaN(v)) {
      return NextResponse.json({ ok: false, error: "bad_value" }, { status: 400 });
    }
    try {
      const res = await applySetpoint(ip, varsCfg, v);
      if (!res || !res.ok) {
        return NextResponse.json({ ok: false, error: "write_failed" }, { status: 502 });
      }
      const actual = typeof res.actual === "number" && !Number.isNaN(res.actual) ? res.actual : null;
      return NextResponse.json({ ok: true, actual });
    } catch {
      return NextResponse.json({ ok: false, error: "write_failed" }, { status: 502 });
    }
  }

  if (kind === "status") {
    try {
      const status = await readStatus(ip, varsCfg);
      return NextResponse.json(status);
    } catch {
      return NextResponse.json({ ok: false, error: "unreachable" }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: false, error: "unsupported_kind" }, { status: 400 });
}
