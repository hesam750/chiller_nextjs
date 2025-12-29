import crypto from "crypto";
import { cookies } from "next/headers";

type SessionRole = "admin" | "manager" | "viewer";

type SessionPayload = {
  username: string;
  role: SessionRole;
  exp: number;
};

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret";

function sign(payload: SessionPayload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

function verify(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(data)
    .digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    ) as SessionPayload;
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies() {
  const store = await cookies();
  const token = store.get("session")?.value;
  return verify(token);
}

export function createSession(username: string, role: SessionRole) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  return sign({ username, role, exp });
}
