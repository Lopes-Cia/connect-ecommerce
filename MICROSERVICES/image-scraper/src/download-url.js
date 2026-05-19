import fs from "node:fs";
import path from "node:path";

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

export async function downloadImageToTermsFolder({ url, term }) {
  const sourceUrl = String(url || "").trim();
  const query = String(term || "").trim();
  if (!sourceUrl)
    return {
      ok: false,
      term: query,
      url: "",
      savedPath: "",
      bytes: 0,
      contentType: "",
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
      status: res.status,
      statusText: res.statusText,
      error: "http_error",
    };
  }
  if (!String(contentType).toLowerCase().startsWith("image/")) {
    return {
      ok: false,
      term: query,
      url: sourceUrl,
      savedPath: "",
      bytes: 0,
      contentType,
      status: res.status,
      statusText: res.statusText,
      error: "not_an_image",
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
      status: res.status,
      statusText: res.statusText,
      error: "empty_body",
    };
  }

  const root = process.cwd();
  const outDir = path.join(root, "data", "assets", "images", "terms");
  ensureDir(outDir);

  const base = slugify(query) || "term";
  const ext = extensionFromContentType(contentType) || extensionFromUrl(sourceUrl) || ".jpg";
  const filename = `${base}${ext}`;
  const absolutePath = path.join(outDir, filename);
  fs.writeFileSync(absolutePath, buffer);

  return {
    ok: true,
    term: query,
    url: sourceUrl,
    savedPath: absolutePath,
    bytes: buffer.length,
    contentType,
    status: res.status,
    statusText: res.statusText,
  };
}

export async function downloadImagesToTermsFolder({ urls, term, count }) {
  const query = String(term || "").trim();
  const n = Number.isFinite(Number(count)) ? Math.max(1, Math.min(20, Number(count))) : 3;
  const list = Array.isArray(urls) ? urls.map((u) => String(u || "").trim()).filter(Boolean) : [];
  const picked = list.slice(0, n);
  const items = [];

  for (let i = 0; i < picked.length; i += 1) {
    const url = picked[i];
    const one = await downloadImageToTermsFolder({ url, term: `${query}-${i + 1}` });
    items.push(one);
  }

  const ok = items.some((it) => it?.ok);
  return { ok, term: query, countRequested: n, countAttempted: picked.length, items };
}
