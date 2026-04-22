import { parseIntStrict } from "./parse.mjs";

function parseIdFromKey(prefix, key) {
  const v = String(key || "");
  const p = `${prefix}:`;
  const idx = v.lastIndexOf(p);
  if (idx === -1) return undefined;
  const raw = v.slice(idx + p.length);
  try {
    return parseIntStrict(raw, "id");
  } catch {
    return undefined;
  }
}

export async function pruneByPrefix({ client, scanPrefix, idPrefix, keepIds, batchSize, scanCount }) {
  let cursor = "0";
  let scanned = 0;
  let deleted = 0;

  do {
    const res = await client.sendCommand(["SCAN", cursor, "MATCH", `${scanPrefix}*`, "COUNT", String(scanCount)]);
    if (!Array.isArray(res) || res.length !== 2) break;
    cursor = String(res[0]);
    const keys = Array.isArray(res[1]) ? res[1].map((k) => String(k)) : [];
    scanned += keys.length;

    const toDelete = [];
    for (const k of keys) {
      const id = parseIdFromKey(idPrefix, k);
      if (typeof id !== "number") continue;
      if (!keepIds.has(id)) toDelete.push(k);
    }

    for (let i = 0; i < toDelete.length; i += batchSize) {
      const chunk = toDelete.slice(i, i + batchSize);
      if (!chunk.length) continue;
      const multi = client.multi();
      for (const k of chunk) multi.sendCommand(["UNLINK", k]);
      await multi.exec();
      deleted += chunk.length;
    }
  } while (cursor !== "0");

  return { scanned, deleted };
}
