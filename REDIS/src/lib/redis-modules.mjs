function normalizeModuleName(n) {
  return String(n || "")
    .trim()
    .toLowerCase();
}

export async function listModules(client) {
  const raw = await client.sendCommand(["MODULE", "LIST"]);
  if (!Array.isArray(raw)) return [];

  const modules = [];
  for (const entry of raw) {
    if (!Array.isArray(entry)) continue;
    const obj = {};
    for (let i = 0; i < entry.length; i += 2) {
      const k = entry[i];
      const v = entry[i + 1];
      obj[String(k)] = v;
    }
    modules.push(obj);
  }
  return modules;
}

export function detectModules(modules) {
  const names = new Set(modules.map((m) => normalizeModuleName(m.name)));
  const hasRedisJson = names.has("rejson") || names.has("redisjson") || names.has("json");
  const hasRediSearch = names.has("search") || names.has("redisearch");
  return { hasRedisJson, hasRediSearch, moduleNames: Array.from(names).filter(Boolean).sort() };
}

