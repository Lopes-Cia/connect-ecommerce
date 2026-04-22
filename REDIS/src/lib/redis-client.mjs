import { createClient } from "redis";
import { getRedisConfig } from "./env.mjs";

function buildUrlFromParts({ host, port, username, password }) {
  if (!host) return "";
  const safePort = port || 6379;
  const auth = username || password ? `${encodeURIComponent(username || "default")}:${encodeURIComponent(password || "")}@` : "";
  return `rediss://${auth}${host}:${safePort}`;
}

function withTimeout(promise, ms, message) {
  const timeoutMs = Number(ms);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  let t;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      t = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(t));
}

export async function createRedisClient() {
  const cfg = getRedisConfig();
  const url = cfg.url || buildUrlFromParts(cfg);
  if (!url) {
    throw new Error("Config Redis ausente: defina REDIS_URL ou REDIS_HOST/REDIS_PORT.");
  }

  const socketBase = {
    connectTimeout: 10_000,
    reconnectStrategy: (retries) => {
      if (retries >= 2) return new Error("Falha ao conectar no Redis (retries excedidos).");
      return 250;
    },
  };

  const socket = cfg.tlsEnabled
    ? {
        ...socketBase,
        tls: true,
        servername: cfg.tlsServername || undefined,
      }
    : socketBase;

  const client = createClient({ url, socket });

  client.on("error", () => {});

  await withTimeout(client.connect(), 12_000, "Timeout ao conectar no Redis.");

  return { client, cfg };
}
