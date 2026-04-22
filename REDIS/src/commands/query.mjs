import { createRedisClient } from "../lib/redis-client.mjs";
import { printJson, fail } from "../lib/cli-output.mjs";
import { parseBoolStrict, parseIntStrict, parseNumberStrict } from "../lib/parse.mjs";

const INDEX_NAME = "idx:catalog:product";

function escapeQueryText(value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function normalizeSort(value) {
  const v = String(value || "name:asc").trim().toLowerCase();
  const [fieldRaw, dirRaw] = v.split(":");
  const field = fieldRaw || "name";
  const dir = (dirRaw || "asc").toLowerCase();

  const allowedFields = new Set(["id", "name", "price", "stock"]);
  const allowedDirs = new Set(["asc", "desc"]);
  if (!allowedFields.has(field)) throw new Error("--sort inválido (campos: id,name,price,stock)");
  if (!allowedDirs.has(dir)) throw new Error("--sort inválido (direções: asc,desc)");
  return { field, dir };
}

function buildSearchQuery({ q, brandId, categoryId, inStock, priceMin, priceMax }) {
  const parts = [];

  const qText = escapeQueryText(q);
  if (qText) {
    parts.push(`(@name:"${qText}")`);
  } else {
    parts.push("*");
  }

  if (typeof brandId === "number") parts.push(`@brandId:[${brandId} ${brandId}]`);
  if (typeof categoryId === "number") parts.push(`@categoryId:[${categoryId} ${categoryId}]`);

  if (typeof inStock === "boolean") parts.push(`@inStock:{${inStock ? "true" : "false"}}`);

  const min = typeof priceMin === "number" ? priceMin : "-inf";
  const max = typeof priceMax === "number" ? priceMax : "+inf";
  if (min !== "-inf" || max !== "+inf") parts.push(`@price:[${min} ${max}]`);

  return parts.join(" ");
}

function parseFtSearchResponse(raw) {
  if (!Array.isArray(raw) || raw.length < 1) return { total: 0, docs: [] };
  const total = Number(raw[0]) || 0;

  const docs = [];
  for (let i = 1; i < raw.length; i += 2) {
    const key = String(raw[i]);
    const payload = raw[i + 1];
    const fields = Array.isArray(payload) ? payload : [];
    const obj = {};
    for (let j = 0; j < fields.length; j += 2) {
      obj[String(fields[j])] = fields[j + 1];
    }
    docs.push({ key, fields: obj });
  }

  return { total, docs };
}

export async function runQuery(options) {
  let client;
  try {
    const page = parseIntStrict(options.page, "--page") ?? 1;
    const pageSize = parseIntStrict(options.pageSize, "--pageSize") ?? 20;
    if (page < 1) throw new Error("--page deve ser >= 1");
    if (pageSize < 1 || pageSize > 200) throw new Error("--pageSize fora do intervalo (1..200)");

    const brandId = parseIntStrict(options.brandId, "--brandId");
    const categoryId = parseIntStrict(options.categoryId, "--categoryId");
    const inStock = parseBoolStrict(options.inStock, "--inStock");
    const priceMin = parseNumberStrict(options.priceMin, "--priceMin");
    const priceMax = parseNumberStrict(options.priceMax, "--priceMax");

    const sort = normalizeSort(options.sort);
    const offset = (page - 1) * pageSize;

    const query = buildSearchQuery({
      q: options.q,
      brandId,
      categoryId,
      inStock,
      priceMin,
      priceMax,
    });

    const conn = await createRedisClient();
    client = conn.client;

    const raw = await client.sendCommand([
      "FT.SEARCH",
      INDEX_NAME,
      query,
      "SORTBY",
      sort.field,
      sort.dir.toUpperCase(),
      "LIMIT",
      String(offset),
      String(pageSize),
      "RETURN",
      "1",
      "$",
      "DIALECT",
      "2",
    ]);

    const parsed = parseFtSearchResponse(raw);
    const items = parsed.docs
      .map((d) => d.fields?.["$"])
      .filter((v) => typeof v === "string")
      .map((v) => {
        try {
          return JSON.parse(v);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    printJson({
      ok: true,
      index: INDEX_NAME,
      query,
      page,
      pageSize,
      total: parsed.total,
      items,
    });
  } catch (err) {
    fail("Falha ao consultar produtos", { message: err?.message || String(err) });
  } finally {
    try {
      await client?.quit();
    } catch {}
  }
}
