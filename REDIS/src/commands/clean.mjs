import { createRedisClient } from "../lib/redis-client.mjs";
import { printJson, fail } from "../lib/cli-output.mjs";
import { parseIntStrict } from "../lib/parse.mjs";

async function deleteByPrefix({ client, prefix, batchSize, scanCount }) {
  let cursor = "0";
  let deleted = 0;
  let scanned = 0;

  do {
    const res = await client.sendCommand(["SCAN", cursor, "MATCH", `${prefix}:*`, "COUNT", String(scanCount)]);
    if (!Array.isArray(res) || res.length !== 2) break;
    cursor = String(res[0]);
    const keys = Array.isArray(res[1]) ? res[1].map((k) => String(k)) : [];
    scanned += keys.length;

    for (let i = 0; i < keys.length; i += batchSize) {
      const chunk = keys.slice(i, i + batchSize);
      if (!chunk.length) continue;
      const multi = client.multi();
      for (const k of chunk) multi.sendCommand(["UNLINK", k]);
      await multi.exec();
      deleted += chunk.length;
    }
  } while (cursor !== "0");

  return { scanned, deleted };
}

export async function runClean(options) {
  let client;
  try {
    const batchSize = parseIntStrict(options.batch, "--batch") ?? 500;
    const scanCount = parseIntStrict(options.scanCount, "--scanCount") ?? 2000;
    if (batchSize < 1 || batchSize > 5000) throw new Error("--batch fora do intervalo (1..5000)");
    if (scanCount < 1 || scanCount > 100000) throw new Error("--scanCount fora do intervalo (1..100000)");

    const conn = await createRedisClient();
    client = conn.client;

    const prefix = conn.cfg.catalogKeyPrefix || "catalog" || "sample_*";
    const result = await deleteByPrefix({ client, prefix, batchSize, scanCount });

    printJson({ ok: true, prefix, ...result });
  } catch (err) {
    fail("Falha ao limpar namespace do catálogo", { message: err?.message || String(err) });
  } finally {
    try {
      await client?.quit();
    } catch {}
  }
}

