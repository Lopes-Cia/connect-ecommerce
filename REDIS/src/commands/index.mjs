import { createRedisClient } from "../lib/redis-client.mjs";
import { printJson, fail } from "../lib/cli-output.mjs";

const PRODUCT_INDEX = "idx:catalog:product";
const CATEGORY_INDEX = "idx:catalog:category";

async function listIndexes(client) {
  const res = await client.sendCommand(["FT._LIST"]);
  if (!Array.isArray(res)) return [];
  return res.map((x) => String(x));
}

function buildCreateIndexCommand(prefix) {
  return [
    "FT.CREATE",
    PRODUCT_INDEX,
    "ON",
    "JSON",
    "PREFIX",
    "1",
    `${prefix}:product:`,
    "SCHEMA",
    "$.rank",
    "AS",
    "rank",
    "NUMERIC",
    "SORTABLE",
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

function buildCreateCategoryIndexCommand(prefix) {
  return [
    "FT.CREATE",
    CATEGORY_INDEX,
    "ON",
    "JSON",
    "PREFIX",
    "1",
    `${prefix}:category:`,
    "SCHEMA",
    "$.id",
    "AS",
    "id",
    "NUMERIC",
    "SORTABLE",
    "$.parentId",
    "AS",
    "parentId",
    "NUMERIC",
    "SORTABLE",
    "$.order",
    "AS",
    "order",
    "NUMERIC",
    "SORTABLE",
    "$.name",
    "AS",
    "name",
    "TEXT",
    "SORTABLE",
    "$.slug",
    "AS",
    "slug",
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
    const existsProduct = indexes.includes(PRODUCT_INDEX);
    const existsCategory = indexes.includes(CATEGORY_INDEX);

    const product = { created: false, dropped: false };
    const category = { created: false, dropped: false };

    if (options.drop && existsProduct) {
      await client.sendCommand(["FT.DROPINDEX", PRODUCT_INDEX, "DD"]);
      product.dropped = true;
    }
    if (options.drop && existsCategory) {
      await client.sendCommand(["FT.DROPINDEX", CATEGORY_INDEX, "DD"]);
      category.dropped = true;
    }

    const indexesAfterDrop = options.drop ? await listIndexes(client) : indexes;
    const existsProductNow = indexesAfterDrop.includes(PRODUCT_INDEX);
    const existsCategoryNow = indexesAfterDrop.includes(CATEGORY_INDEX);

    if (!existsProductNow) {
      await client.sendCommand(buildCreateIndexCommand(prefix));
      product.created = true;
    }
    if (!existsCategoryNow) {
      await client.sendCommand(buildCreateCategoryIndexCommand(prefix));
      category.created = true;
    }

    printJson({
      ok: true,
      created: product.created || category.created,
      dropped: product.dropped || category.dropped,
      product: { index: PRODUCT_INDEX, prefix: `${prefix}:product:`, ...product },
      category: { index: CATEGORY_INDEX, prefix: `${prefix}:category:`, ...category },
    });
  } catch (err) {
    fail("Falha ao criar/garantir índice", { message: err?.message || String(err) });
  } finally {
    try {
      await client?.quit();
    } catch {}
  }
}
