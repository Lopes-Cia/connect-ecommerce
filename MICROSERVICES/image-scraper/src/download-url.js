import fs from "node:fs";
import path from "node:path";
import sizeOf from "image-size";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function extensionFromContentType(contentType) {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("image/webp")) return ".webp";
  if (ct.includes("image/png")) return ".png";
  if (ct.includes("image/jpeg")) return ".jpg";
  if (ct.includes("image/jpg")) return ".jpg";
  if (ct.includes("image/gif")) return ".gif";
  if (ct.includes("image/svg")) return ".svg";
  return "";
}

function extensionFromUrl(url) {
  const u = String(url || "").toLowerCase();
  if (u.endsWith(".webp")) return ".webp";
  if (u.endsWith(".png")) return ".png";
  if (u.endsWith(".jpg")) return ".jpg";
  if (u.endsWith(".jpeg")) return ".jpg";
  if (u.endsWith(".gif")) return ".gif";
  if (u.endsWith(".svg")) return ".svg";
  return "";
}

function buildRequestHeaders() {
  return {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  };
}

function resolveTermsOutDir(outDir) {
  const candidate = String(outDir || "").trim();
  if (candidate && path.isAbsolute(candidate)) return candidate;
  const root = process.cwd();
  if (candidate) return path.join(root, candidate);
  return path.join(root, "data", "assets", "images", "terms");
}

function normalizeQuality(quality) {
  if (!quality || typeof quality !== "object") return null;
  const minBytes = Number.isFinite(Number(quality.minBytes)) ? Number(quality.minBytes) : null;
  const minWidth = Number.isFinite(Number(quality.minWidth)) ? Number(quality.minWidth) : null;
  const minHeight = Number.isFinite(Number(quality.minHeight)) ? Number(quality.minHeight) : null;
  return {
    minBytes: minBytes && minBytes > 0 ? minBytes : null,
    minWidth: minWidth && minWidth > 0 ? minWidth : null,
    minHeight: minHeight && minHeight > 0 ? minHeight : null,
  };
}

export async function downloadImageToTermsFolder({ url, term, outDir, quality }) {
  const sourceUrl = String(url || "").trim();
  const query = String(term || "").trim();
  const q = normalizeQuality(quality);
  const urlExt = extensionFromUrl(sourceUrl);
  const isSvgByUrl = urlExt === ".svg";
  if (!sourceUrl)
    return {
      ok: false,
      term: query,
      url: "",
      savedPath: "",
      bytes: 0,
      contentType: "",
      width: 0,
      height: 0,
      status: 0,
      statusText: "",
      error: "empty_url",
    };

  let res;
  try {
    res = await fetch(sourceUrl, { headers: buildRequestHeaders(), redirect: "follow" });
  } catch (e) {
    return {
      ok: false,
      term: query,
      url: sourceUrl,
      savedPath: "",
      bytes: 0,
      contentType: "",
      width: 0,
      height: 0,
      status: 0,
      statusText: "",
      error: e instanceof Error ? e.message : "fetch_failed",
    };
  }

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    return {
      ok: false,
      term: query,
      url: sourceUrl,
      savedPath: "",
      bytes: 0,
      contentType,
      width: 0,
      height: 0,
      status: res.status,
      statusText: res.statusText,
      error: "http_error",
    };
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) {
    return {
      ok: false,
      term: query,
      url: sourceUrl,
      savedPath: "",
      bytes: 0,
      contentType,
      width: 0,
      height: 0,
      status: res.status,
      statusText: res.statusText,
      error: "empty_body",
    };
  }

  if (q?.minBytes && buffer.length < q.minBytes) {
    return {
      ok: false,
      term: query,
      url: sourceUrl,
      savedPath: "",
      bytes: buffer.length,
      contentType,
      width: 0,
      height: 0,
      status: res.status,
      statusText: res.statusText,
      error: "min_bytes",
    };
  }

  const ctLower = String(contentType).toLowerCase();
  const isSvg = ctLower.includes("image/svg") || isSvgByUrl;
  let width = 0;
  let height = 0;
  if (!isSvg) {
    try {
      const dims = sizeOf(buffer);
      width = Number.isFinite(Number(dims?.width)) ? Number(dims.width) : 0;
      height = Number.isFinite(Number(dims?.height)) ? Number(dims.height) : 0;
    } catch {}
  }

  const isImageContentType = ctLower.startsWith("image/");
  const allowOctetStream = ctLower.includes("application/octet-stream") && Boolean(urlExt);
  const allowBySize = Boolean(width && height);
  if (!isImageContentType && !allowOctetStream && !allowBySize) {
    return {
      ok: false,
      term: query,
      url: sourceUrl,
      savedPath: "",
      bytes: buffer.length,
      contentType,
      width,
      height,
      status: res.status,
      statusText: res.statusText,
      error: "not_an_image",
    };
  }

  if ((q?.minWidth || q?.minHeight) && !isSvg) {
    if (!width || !height) {
      return {
        ok: false,
        term: query,
        url: sourceUrl,
        savedPath: "",
        bytes: buffer.length,
        contentType,
        width,
        height,
        status: res.status,
        statusText: res.statusText,
        error: "unknown_dimensions",
      };
    }
    if (q.minWidth && width < q.minWidth) {
      return {
        ok: false,
        term: query,
        url: sourceUrl,
        savedPath: "",
        bytes: buffer.length,
        contentType,
        width,
        height,
        status: res.status,
        statusText: res.statusText,
        error: "min_width",
      };
    }
    if (q.minHeight && height < q.minHeight) {
      return {
        ok: false,
        term: query,
        url: sourceUrl,
        savedPath: "",
        bytes: buffer.length,
        contentType,
        width,
        height,
        status: res.status,
        statusText: res.statusText,
        error: "min_height",
      };
    }
  }

  const resolvedOutDir = resolveTermsOutDir(outDir);
  ensureDir(resolvedOutDir);

  const base = slugify(query) || "term";
  const ext = extensionFromContentType(contentType) || extensionFromUrl(sourceUrl) || ".jpg";
  const filename = `${base}${ext}`;
  const absolutePath = path.join(resolvedOutDir, filename);
  fs.writeFileSync(absolutePath, buffer);

  return {
    ok: true,
    term: query,
    url: sourceUrl,
    savedPath: absolutePath,
    bytes: buffer.length,
    contentType,
    width,
    height,
    status: res.status,
    statusText: res.statusText,
  };
}

export async function downloadImagesToTermsFolder({ urls, term, count, outDir, quality, attemptLimit }) {
  const query = String(term || "").trim();
  const n = Number.isFinite(Number(count)) ? Math.max(1, Math.min(20, Number(count))) : 3;
  const list = Array.isArray(urls) ? urls.map((u) => String(u || "").trim()).filter(Boolean) : [];
  const q = normalizeQuality(quality);
  const hasQuality = Boolean(q?.minBytes || q?.minWidth || q?.minHeight);
  const items = [];

  const limitArg = Number.isFinite(Number(attemptLimit)) ? Number(attemptLimit) : null;
  const shouldExtend = list.length > n || Boolean(limitArg) || hasQuality;

  if (!shouldExtend) {
    const picked = list.slice(0, n);
    for (let i = 0; i < picked.length; i += 1) {
      const url = picked[i];
      const one = await downloadImageToTermsFolder({ url, term: `${query}-${i + 1}`, outDir, quality });
      items.push(one);
    }

    const ok = items.some((it) => it?.ok);
    return { ok, term: query, countRequested: n, countAttempted: picked.length, items };
  }

  const limit = Math.min(list.length, limitArg && limitArg > 0 ? limitArg : Math.max(n * 10, 30));
  let attempts = 0;
  let okCount = 0;
  for (let i = 0; i < list.length; i += 1) {
    if (okCount >= n) break;
    if (attempts >= limit) break;

    const url = list[i];
    attempts += 1;
    const one = await downloadImageToTermsFolder({ url, term: `${query}-${attempts}`, outDir, quality });
    items.push(one);
    if (one?.ok) okCount += 1;
  }

  return {
    ok: okCount > 0,
    term: query,
    countRequested: n,
    countAttempted: attempts,
    countOk: okCount,
    attemptLimit: limit,
    items,
  };
}
