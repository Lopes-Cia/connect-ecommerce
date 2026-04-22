import crypto from "node:crypto";
import { createRedisClient } from "../lib/redis-client.mjs";
import { printJson, fail } from "../lib/cli-output.mjs";
import { detectModules, listModules } from "../lib/redis-modules.mjs";

export async function runHealth() {
  let client;
  try {
    const conn = await createRedisClient();
    client = conn.client;
    const keyPrefix = conn.cfg.catalogKeyPrefix || "catalog";

    const pong = await client.ping();
    let detected = { hasRedisJson: false, hasRediSearch: false, moduleNames: [] };
    try {
      const modules = await listModules(client);
      detected = detectModules(modules);
    } catch {
      detected = { hasRedisJson: false, hasRediSearch: false, moduleNames: [] };
    }

    const testKey = `${keyPrefix}:__health__:${crypto.randomUUID()}`;
    let jsonOk = false;
    try {
      await client.sendCommand(["JSON.SET", testKey, "$", JSON.stringify({ ok: true, at: new Date().toISOString() })]);
      const val = await client.sendCommand(["JSON.GET", testKey, "$"]);
      jsonOk = typeof val === "string" && val.includes('"ok":true');
    } catch {
      jsonOk = false;
    } finally {
      try {
        await client.del(testKey);
      } catch {}
    }

    let searchOk = false;
    try {
      await client.sendCommand(["FT._LIST"]);
      searchOk = true;
    } catch {
      searchOk = false;
    }

    const ok = pong === "PONG" && jsonOk && searchOk;

    printJson({
      ok,
      ping: pong,
      modules: detected,
      checks: {
        redisJsonCommandOk: jsonOk,
        rediSearchCommandOk: searchOk,
      },
    });
  } catch (err) {
    fail("Falha no healthcheck do Redis", { message: err?.message || String(err) });
  } finally {
    try {
      await client?.quit();
    } catch {}
  }
}
