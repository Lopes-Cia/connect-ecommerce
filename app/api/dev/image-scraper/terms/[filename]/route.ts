import fs from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pickContentType(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function isSafeFilename(filename: string) {
  const value = String(filename ?? "");
  if (!value) return false;
  if (value.length > 200) return false;
  if (value.includes("/") || value.includes("\\") || value.includes("..")) return false;
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ filename: string }> },
) {
  try {
    if (process.env.IMAGE_SCRAPER_ENABLED !== "1") {
      return NextResponse.json({ ok: false, error: "IMAGE_SCRAPER_ENABLED!=1" }, { status: 403 });
    }

    const { filename } = await context.params;
    if (!isSafeFilename(filename)) {
      return NextResponse.json({ ok: false, error: "filename_invalido" }, { status: 400 });
    }

    const repoRoot = process.cwd();
    const termsRoot = path.join(
      repoRoot,
      "MICROSERVICES",
      "image-scraper",
      "data",
      "assets",
      "images",
      "terms",
    );
    const absolutePath = path.join(termsRoot, filename);

    const buffer = await fs.readFile(absolutePath);
    const contentType = pickContentType(filename);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 404 });
  }
}
