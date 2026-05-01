import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export interface SessionCliente {
  cnpj: string;
  customerId: number;
  email?: string;
  nome?: string;
}

export interface Session {
  userId: string;
  email: string;
  token: string;
  name?: string;
  cliente?: SessionCliente;
}

type SignedSessionPayload = Session & {
  v: 1;
  exp: number;
};

const COOKIE_NAME = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret(): string {
  const secret = String(process.env.GP_CLIENTE_INTEGRADO_TOKEN ?? "").trim();
  if (!secret) {
    throw new Error("Missing env: GP_CLIENTE_INTEGRADO_TOKEN");
  }
  return secret;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecodeToString(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signPayload(payloadBase64Url: string): string {
  const secret = getSessionSecret();
  return createHmac("sha256", secret).update(payloadBase64Url).digest("base64url");
}

function toSignedCookieValue(payload: SignedSessionPayload): string {
  const payloadJson = JSON.stringify(payload);
  const payloadEncoded = base64UrlEncode(payloadJson);
  const signature = signPayload(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

function safeEqualBase64Url(a: string, b: string): boolean {
  const left = Buffer.from(a, "base64url");
  const right = Buffer.from(b, "base64url");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseSignedSession(value: string): Session | null {
  const parts = String(value).split(".");
  if (parts.length !== 2) return null;
  const [payloadEncoded, signature] = parts;
  if (!payloadEncoded || !signature) return null;

  const expected = signPayload(payloadEncoded);
  if (!safeEqualBase64Url(signature, expected)) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(base64UrlDecodeToString(payloadEncoded)) as unknown;
  } catch {
    return null;
  }

  const obj = asRecord(decoded);
  if (!obj) return null;
  if (obj.v !== 1) return null;

  const exp = typeof obj.exp === "number" ? obj.exp : Number.NaN;
  if (!Number.isFinite(exp) || exp <= Date.now()) return null;

  const userId = String(obj.userId ?? "").trim();
  const email = String(obj.email ?? "").trim();
  const token = String(obj.token ?? "").trim();
  if (!userId || !token) return null;

  const clienteRaw = asRecord(obj.cliente);
  const cliente =
    clienteRaw && String(clienteRaw.cnpj ?? "").trim() && Number.isFinite(Number(clienteRaw.customerId))
      ? {
          cnpj: String(clienteRaw.cnpj).trim(),
          customerId: Number(clienteRaw.customerId),
          email: clienteRaw.email ? String(clienteRaw.email).trim() : undefined,
          nome: clienteRaw.nome ? String(clienteRaw.nome).trim() : undefined,
        }
      : undefined;

  const session: Session = {
    userId,
    email,
    token,
    name: obj.name ? String(obj.name) : undefined,
    cliente,
  };

  return session;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  if (!sessionCookie?.value) return null;
  return parseSignedSession(sessionCookie.value);
}

export async function setSession(session: Session): Promise<void> {
  const cookieStore = await cookies();
  const payload: SignedSessionPayload = {
    v: 1,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    ...session,
  };

  cookieStore.set(COOKIE_NAME, toSignedCookieValue(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
