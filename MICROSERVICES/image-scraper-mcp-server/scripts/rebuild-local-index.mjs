import fs from "node:fs/promises";
import path from "node:path";

function normalizeForSearch(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value) {
  const normalized = normalizeForSearch(value).replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalized) return [];
  const parts = normalized.split(/\s+/g).filter(Boolean);
  const seen = new Set();
  const unique = [];
  for (const part of parts) {
    if (!part) continue;
    if (seen.has(part)) continue;
    seen.add(part);
    unique.push(part);
  }
  return unique;
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const v of values) {
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function buildKindFromRelPath(relPath) {
  const p = normalizeForSearch(relPath);
  if (p.includes("logo") || p.includes("logotipo") || p.includes("logotipos")) return "logo";
  return "image";
}

async function tryReadJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function coerceTokensFromConfigJson(configJson) {
  if (!configJson || typeof configJson !== "object") return [];
  const cfg = configJson;
  const nome = typeof cfg.nome === "string" ? cfg.nome : "";
  const url = typeof cfg.url === "string" ? cfg.url : "";
  return [...tokenize(nome), ...tokenize(url)];
}

async function buildIndexFile(rootDir) {
  const allowedExt = new Set([".webp"]);
  const items = [];
  const stack = [{ absDir: rootDir, relDir: "", inheritedTokens: tokenize(path.basename(rootDir)) }];

  while (stack.length) {
    const current = stack.pop();
    if (!current) break;

    let dirents = [];
    try {
      dirents = await fs.readdir(current.absDir, { withFileTypes: true });
    } catch {
      continue;
    }

    let nextTokens = current.inheritedTokens;
    const hasConfig = dirents.some((d) => d?.isFile?.() && d.name === "config.json");
    if (hasConfig) {
      const configJson = await tryReadJsonFile(path.join(current.absDir, "config.json"));
      if (configJson) {
        const cfgTokens = coerceTokensFromConfigJson(configJson);
        if (cfgTokens.length) nextTokens = [...nextTokens, ...cfgTokens];
      }
    }

    const candidates = [];

    for (const dirent of dirents) {
      if (!dirent?.name) continue;
      if (dirent.name.startsWith(".")) continue;

      const absPath = path.join(current.absDir, dirent.name);
      const childRelPath = current.relDir ? path.posix.join(current.relDir, dirent.name) : dirent.name;

      if (dirent.isDirectory()) {
        stack.push({
          absDir: absPath,
          relDir: childRelPath,
          inheritedTokens: [...nextTokens, ...tokenize(dirent.name)],
        });
        continue;
      }

      if (!dirent.isFile()) continue;
      const ext = path.extname(dirent.name).toLowerCase();
      if (!allowedExt.has(ext)) continue;

      const baseName = path.parse(dirent.name).name;
      const fileTokens = [...tokenize(baseName), ...tokenize(childRelPath)];

      candidates.push({
        absPath,
        relPath: childRelPath,
        kind: buildKindFromRelPath(childRelPath),
        tokens: uniqueStrings([...nextTokens, ...fileTokens]),
      });
    }

    const batchSize = 16;
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      const stats = await Promise.all(
        batch.map(async (c) => {
          try {
            const st = await fs.stat(c.absPath);
            const sizeBytes = Number.isFinite(st.size) ? st.size : 0;
            const mtimeMs = Number.isFinite(st.mtimeMs) ? st.mtimeMs : 0;
            return { sizeBytes, mtimeMs };
          } catch {
            return { sizeBytes: 0, mtimeMs: 0 };
          }
        })
      );

      for (let j = 0; j < batch.length; j += 1) {
        const c = batch[j];
        const st = stats[j];
        items.push({
          relPath: c.relPath,
          kind: c.kind,
          tokens: c.tokens,
          sizeBytes: st.sizeBytes,
          mtimeMs: st.mtimeMs,
        });
      }
    }
  }

  return { version: 1, rootDir, generatedAt: new Date().toISOString(), items };
}

async function main() {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), "../../url-scraper/data/assets/files");
  const outPath = path.join(rootDir, ".image-index.json");

  const indexFile = await buildIndexFile(rootDir);
  await fs.writeFile(outPath, JSON.stringify(indexFile), "utf8");
  process.stdout.write(JSON.stringify({ ok: true, rootDir, outPath, count: indexFile.items.length }));
}

main().catch((err) => {
  process.stdout.write(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Erro" }));
  process.exitCode = 1;
});

