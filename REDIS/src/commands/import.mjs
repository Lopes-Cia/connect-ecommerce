import fs from "node:fs/promises";
import path from "node:path";
import { createRedisClient } from "../lib/redis-client.mjs";
import { printJson, fail } from "../lib/cli-output.mjs";
import { parseIntStrict } from "../lib/parse.mjs";

const TYPE_MAP = {
  brands: { file: "brands.json", type: "brand" },
  categorias: { file: "categorias.json", type: "category" },
  produtos: { file: "produtos.json", type: "product" },
};

function pickOnlyTypes(raw) {
  const all = Object.keys(TYPE_MAP);
  const v = String(raw || "").trim();
  if (!v) return all;
  const parts = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const invalid = parts.filter((p) => !all.includes(p));
  if (invalid.length) throw new Error(`--only inválido: ${invalid.join(", ")}`);
  return parts;
}

async function readJsonArray(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) throw new Error(`JSON inválido (esperado array): ${filePath}`);
  return parsed;
}

async function importType({ client, keyPrefix, baseDir, kind, batchSize }) {
  const spec = TYPE_MAP[kind];
  const filePath = path.resolve(process.cwd(), baseDir, spec.file);
  const items = await readJsonArray(filePath);

  let written = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const multi = client.multi();
    for (const doc of chunk) {
      const id = doc?.id;
      if (id === undefined || id === null) throw new Error(`Documento sem id em ${spec.file}`);
      const key = `${keyPrefix}:${spec.type}:${id}`;
      multi.sendCommand(["JSON.SET", key, "$", JSON.stringify(doc)]);
    }
    await multi.exec();
    written += chunk.length;
  }

  return { kind, type: spec.type, file: spec.file, total: items.length, written };
}

export async function runImport(options) {
  let client;
  try {
    const onlyKinds = pickOnlyTypes(options.only);
    const batchSize = parseIntStrict(options.batch, "--batch") ?? 250;
    if (batchSize < 1 || batchSize > 5000) throw new Error("--batch fora do intervalo (1..5000)");

    const conn = await createRedisClient();
    client = conn.client;
    const keyPrefix = conn.cfg.catalogKeyPrefix || "catalog";

    const baseDir = options.dir || "JSON";

    const results = [];
    for (const kind of onlyKinds) {
      results.push(await importType({ client, keyPrefix, baseDir, kind, batchSize }));
    }

    printJson({ ok: true, prefix: keyPrefix, imported: results });
  } catch (err) {
    fail("Falha ao importar JSON", { message: err?.message || String(err) });
  } finally {
    try {
      await client?.quit();
    } catch {}
  }
}

