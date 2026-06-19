import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const intervalMinutesRaw = Number.parseInt(process.env.SYNC_INTERVAL_MINUTES || "10", 10);
const intervalMinutes = Number.isFinite(intervalMinutesRaw) && intervalMinutesRaw > 0 ? intervalMinutesRaw : 10;
const only = process.env.SYNC_ONLY || "produtos";
const skipIfUnchangedRaw = (process.env.SYNC_SKIP_IF_UNCHANGED || "1").trim().toLowerCase();
const skipIfUnchanged =
  skipIfUnchangedRaw === "1" || skipIfUnchangedRaw === "true" || skipIfUnchangedRaw === "yes" || skipIfUnchangedRaw === "on";

const intervalMs = intervalMinutes * 60 * 1000;
const once = process.argv.includes("--once");

let running = false;

async function runSync() {
  if (running) return;
  running = true;
  const startedAt = Date.now();

  try {
    const url = `${appBaseUrl}/api/dev/catalog/sync?only=${encodeURIComponent(only)}${
      skipIfUnchanged ? "&skipIfUnchanged=1" : ""
    }`;
    const response = await fetch(url, { method: "POST" });
    const body = await response.json().catch(() => null);
    const ok = response.ok && Boolean(body && typeof body === "object" && "ok" in body ? body.ok : true);
    const tookMs = Date.now() - startedAt;
    console.log(JSON.stringify({ ok, status: response.status, tookMs, at: new Date().toISOString() }));
    if (!ok) console.log(JSON.stringify({ body }, null, 2));
    return ok;
  } catch (error) {
    const tookMs = Date.now() - startedAt;
    console.error(
      JSON.stringify(
        { ok: false, tookMs, at: new Date().toISOString(), error: error instanceof Error ? error.message : "Erro" },
        null,
        2,
      ),
    );
    return false;
  } finally {
    running = false;
  }
}

if (once) {
  const ok = await runSync();
  process.exit(ok ? 0 : 1);
}

await runSync();
setInterval(runSync, intervalMs);

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
