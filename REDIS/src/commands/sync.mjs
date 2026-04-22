import { createRedisClient } from "../lib/redis-client.mjs";
import { printJson, fail } from "../lib/cli-output.mjs";
import { parseIntStrict } from "../lib/parse.mjs";
import { fetchAllCategorias, fetchAllProdutos, fetchToken } from "../lib/backend-client.mjs";
import { buildFallbackBrands, translateCategorias, translateProdutos } from "../lib/translate-lopes.mjs";
import { pruneByPrefix } from "../lib/redis-prune.mjs";

const TYPE_MAP = {
  produtos: { type: "product" },
  categorias: { type: "category" },
  brands: { type: "brand" },
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

async function upsertJsonDocs({ client, keyPrefix, type, docs, batchSize }) {
  let written = 0;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const multi = client.multi();
    for (const doc of chunk) {
      const id = doc?.id;
      if (id === undefined || id === null) throw new Error(`Documento sem id (type=${type})`);
      const key = `${keyPrefix}:${type}:${id}`;
      multi.sendCommand(["JSON.SET", key, "$", JSON.stringify(doc)]);
    }
    await multi.exec();
    written += chunk.length;
  }
  return written;
}

function idsFromDocs(docs) {
  const s = new Set();
  for (const d of docs) {
    const id = d?.id;
    if (typeof id === "number") s.add(id);
  }
  return s;
}

export async function runSync(options) {
  let client;
  try {
    const onlyKinds = pickOnlyTypes(options.only);
    const batchSize = parseIntStrict(options.batch, "--batch") ?? 250;
    const scanCount = parseIntStrict(options.scanCount, "--scanCount") ?? 2000;
    if (batchSize < 1 || batchSize > 5000) throw new Error("--batch fora do intervalo (1..5000)");
    if (scanCount < 1 || scanCount > 100000) throw new Error("--scanCount fora do intervalo (1..100000)");

    const prune = options.prune !== false;
    const conn = await createRedisClient();
    client = conn.client;
    const keyPrefix = conn.cfg.catalogKeyPrefix || "catalog";

    const token = await fetchToken();
    const authToken = token.hashToken;

    const startedAt = Date.now();

    const result = {
      ok: true,
      prefix: keyPrefix,
      fetched: {},
      written: {},
      pruned: {},
      ms: 0,
      notes: [],
    };

    if (onlyKinds.includes("categorias")) {
      const rawCats = await fetchAllCategorias(authToken);
      const categorias = translateCategorias(rawCats);
      result.fetched.categorias = rawCats.length;
      result.written.categorias = await upsertJsonDocs({ client, keyPrefix, type: "category", docs: categorias, batchSize });

      if (prune) {
        const keepIds = idsFromDocs(categorias);
        result.pruned.categorias = await pruneByPrefix({
          client,
          scanPrefix: `${keyPrefix}:category:`,
          idPrefix: `${keyPrefix}:category`,
          keepIds,
          batchSize,
          scanCount,
        });
      }
    }

    if (onlyKinds.includes("produtos")) {
      const rawProdutos = await fetchAllProdutos(authToken);
      const produtos = translateProdutos(rawProdutos);
      result.fetched.produtos = rawProdutos.length;
      result.written.produtos = await upsertJsonDocs({ client, keyPrefix, type: "product", docs: produtos, batchSize });

      if (prune) {
        const keepIds = idsFromDocs(produtos);
        result.pruned.produtos = await pruneByPrefix({
          client,
          scanPrefix: `${keyPrefix}:product:`,
          idPrefix: `${keyPrefix}:product`,
          keepIds,
          batchSize,
          scanCount,
        });
      }
    }

    if (onlyKinds.includes("brands")) {
      const brands = buildFallbackBrands();
      result.notes.push("brands: endpoint não existe ainda; gravado apenas fallback id=0.");
      result.fetched.brands = 0;
      result.written.brands = await upsertJsonDocs({ client, keyPrefix, type: "brand", docs: brands, batchSize });
      if (prune) {
        result.pruned.brands = { scanned: 0, deleted: 0 };
      }
    }

    result.ms = Date.now() - startedAt;

    printJson(result);
  } catch (err) {
    fail("Falha no sync do catálogo", { message: err?.message || String(err) });
  } finally {
    try {
      await client?.quit();
    } catch {}
  }
}

