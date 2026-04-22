function readEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function readBool(name, fallback = false) {
  const raw = readEnv(name);
  if (!raw) return fallback;
  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

function readInt(name, fallback = 0) {
  const raw = readEnv(name);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function getRedisConfig() {
  const url = readEnv("REDIS_URL");

  const host = readEnv("REDIS_HOST");
  const port = readInt("REDIS_PORT", 0);
  const username = readEnv("REDIS_USERNAME");
  const password = readEnv("REDIS_PASSWORD");

  const tlsEnabled = readBool("REDIS_TLS", true);
  const tlsServername = readEnv("REDIS_TLS_SERVERNAME");

  const catalogKeyPrefix = readEnv("CATALOG_KEY_PREFIX") || "catalog";

  return {
    url,
    host,
    port,
    username,
    password,
    tlsEnabled,
    tlsServername,
    catalogKeyPrefix,
  };
}

export function getBackendConfig() {
  const authBaseUrl = readEnv("BACK_AUTH_BASE_URL");
  const integrationBaseUrl = readEnv("BACK_INTEGRATION_BASE_URL");
  const produto = readEnv("BACK_PRODUTO") || "CONNECT";
  const ean = readEnv("BACK_EAN");
  const idIntegradora = readInt("BACK_IDINTEGRADORA", 0);
  const codCli = readInt("BACK_CODCLI", 0);

  return { authBaseUrl, integrationBaseUrl, produto, ean, idIntegradora, codCli };
}
