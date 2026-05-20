import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import https from "node:https";

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function extFromUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return "";
  try {
    const u = new URL(url);
    const ext = path.extname(u.pathname);
    return ext || "";
  } catch {
    return "";
  }
}

export async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
  return dirPath;
}

function downloadOnce(url, outPath) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Referer: `${u.origin}/`,
          Accept: "*/*"
        }
      },
      (res) => {
      const status = Number(res.statusCode || 0);
      const location = String(res.headers.location || "").trim();
      if (status >= 300 && status < 400 && location) {
        res.resume();
        resolve({ redirect: location });
        return;
      }
      if (status < 200 || status >= 300) {
        res.resume();
        reject(new Error(`download falhou: ${status}`));
        return;
      }

      const file = fs.createWriteStream(outPath);
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve({ ok: true })));
      file.on("error", (err) => reject(err));
      },
    );
    req.on("error", (err) => reject(err));
  });
}

export async function downloadToFile(rawUrl, outPath, maxRedirects = 3) {
  const url = String(rawUrl || "").trim();
  if (!url) throw new Error("url vazia");
  await ensureDir(path.dirname(outPath));

  if (fs.existsSync(outPath)) return outPath;

  let current = url;
  for (let i = 0; i <= maxRedirects; i += 1) {
    const result = await downloadOnce(current, outPath);
    if (result?.ok) return outPath;
    if (result?.redirect) {
      current = new URL(result.redirect, current).toString();
      continue;
    }
    break;
  }

  throw new Error("download falhou");
}
