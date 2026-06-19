import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "session";

function base64UrlToUint8Array(input: string): Uint8Array | null {
  const raw = String(input || "");
  if (!raw) return null;
  const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  try {
    const decoded = atob(padded);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeParseSessionPayload(payloadEncoded: string): { exp: number } | null {
  const bytes = base64UrlToUint8Array(payloadEncoded);
  if (!bytes) return null;
  try {
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const obj = parsed as Record<string, unknown>;
    const exp = typeof obj.exp === "number" ? obj.exp : Number.NaN;
    if (!Number.isFinite(exp)) return null;
    return { exp };
  } catch {
    return null;
  }
}

async function isValidSessionCookie(value: string): Promise<boolean> {
  const secret = String(process.env.GP_CLIENTE_INTEGRADO_TOKEN ?? "").trim();
  if (!secret) return false;

  const raw = String(value || "");
  const [payloadEncoded, signatureProvided] = raw.split(".");
  if (!payloadEncoded || !signatureProvided) return false;

  const payloadInfo = safeParseSessionPayload(payloadEncoded);
  if (!payloadInfo || payloadInfo.exp <= Date.now()) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadEncoded));
  const signatureExpected = uint8ArrayToBase64Url(new Uint8Array(signatureBuffer));
  return signatureExpected === signatureProvided;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/producao")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/dev") || pathname.startsWith("/api/dev")) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const ok = await isValidSessionCookie(sessionCookie);
  if (!ok) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cliente/:path*", "/dev/:path*", "/api/dev/:path*", "/api/producao/:path*"],
};
