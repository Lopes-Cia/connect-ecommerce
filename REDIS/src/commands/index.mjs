import { createRedisClient } from "../lib/redis-client.mjs";
import { printJson, fail } from "../lib/cli-output.mjs";

const INDEX_NAME = "idx:catalog:product";

async function listIndexes(client) {
  const res = await client.sendCommand(["FT._LIST"]);
  if (!Array.isArray(res)) return [];
  return res.map((x) => String(x));
}

function buildCreateIndexCommand(prefix) {
  return [
    "FT.CREATE",
    INDEX_NAME,
    "ON",
    "JSON",
    "PREFIX",
    "1",
    `${prefix}:product:`,
    "SCHEMA",
    "$.id",
    "AS",
    "id",
    "NUMERIC",
    "SORTABLE",
    "$.sku",
    "AS",
    "sku",
    "TAG",
    "$.name",
    "AS",
    "name",
    "TEXT",
    "SORTABLE",
    "$.slug",
    "AS",
    "slug",
    "TAG",
    "$.price",
    "AS",
    "price",
    "NUMERIC",
    "SORTABLE",
    "$.stock",
    "AS",
    "stock",
    "NUMERIC",
    "SORTABLE",
    "$.inStock",
    "AS",
    "inStock",
    "TAG",
    "$.category.id",
    "AS",
    "categoryId",
    "NUMERIC",
    "SORTABLE",
    "$.brand.id",
    "AS",
    "brandId",
    "NUMERIC",
    "SORTABLE",
    "$.badges[*]",
    "AS",
    "badges",
    "TAG",
  ];
}

export async function runIndex(options) {
  let client;
  try {
    const conn = await createRedisClient();
    client = conn.client;
    const prefix = conn.cfg.catalogKeyPrefix || "catalog";

    const indexes = await listIndexes(client);
    const exists = indexes.includes(INDEX_NAME);

    if (exists && options.drop) {
      await client.sendCommand(["FT.DROPINDEX", INDEX_NAME, "DD"]);
    }

    const indexesAfterDrop = options.drop ? await listIndexes(client) : indexes;
    const existsNow = indexesAfterDrop.includes(INDEX_NAME);
    if (!existsNow) {
      await client.sendCommand(buildCreateIndexCommand(prefix));
    }

    printJson({
      ok: true,
      index: INDEX_NAME,
      prefix: `${prefix}:product:`,
      created: !existsNow,
      dropped: Boolean(exists && options.drop),
    });
  } catch (err) {
    fail("Falha ao criar/garantir índice", { message: err?.message || String(err) });
  } finally {
    try {
      await client?.quit();
    } catch {}
  }
}
