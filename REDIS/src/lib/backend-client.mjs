import { getBackendConfig } from "./env.mjs";

function ensureCfg(cfg) {
  if (!cfg.authBaseUrl) throw new Error("BACK_AUTH_BASE_URL ausente.");
  if (!cfg.integrationBaseUrl) throw new Error("BACK_INTEGRATION_BASE_URL ausente.");
  if (!cfg.idIntegradora) throw new Error("BACK_IDINTEGRADORA ausente.");
  if (!cfg.codCli) throw new Error("BACK_CODCLI ausente.");
  if (!cfg.produto) throw new Error("BACK_PRODUTO ausente.");
  if (!cfg.ean) throw new Error("BACK_EAN ausente.");
}

async function readResponseData(res) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  if (contentType.toLowerCase().includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function ensureTokenResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Resposta inválida ao gerar token");
  }
  const obj = value;
  if (typeof obj.hashToken !== "string" || typeof obj.dtExpira !== "string") {
    throw new Error("Resposta inválida ao gerar token");
  }
  return { hashToken: obj.hashToken, dtExpira: obj.dtExpira, refreshToken: obj.refreshToken ?? "" };
}

export async function fetchToken() {
  const cfg = getBackendConfig();
  ensureCfg(cfg);
  const url = `${cfg.authBaseUrl.replace(/\/+$/, "")}/tokenService`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto: cfg.produto,
      ean: cfg.ean,
      idIntegradora: cfg.idIntegradora,
      codCli: cfg.codCli,
    }),
  });
  const data = await readResponseData(res);
  if (res.status !== 200) {
    const msg = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Falha ao gerar token (status ${res.status}): ${msg.slice(0, 500)}`);
  }
  return ensureTokenResponse(data);
}

function buildUrl(base, pathname, query = {}) {
  const b = base.replace(/\/+$/, "");
  let p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (b.toLowerCase().endsWith("/servidor") && p.toLowerCase().startsWith("/servidor/")) {
    p = p.slice("/servidor".length);
  }
  const u = new URL(`${b}${p}`);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

function unwrapList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw;
    const candidates = [obj.data, obj.produtos, obj.products, obj.lista, obj.itens, obj.items];
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
    }
  }
  return [];
}

export async function fetchAllProdutos(authToken) {
  const cfg = getBackendConfig();
  ensureCfg(cfg);
  const url = buildUrl(cfg.integrationBaseUrl, "/Servidor/webservice/integration/getListProdutoLoja", {
    idIntegradora: cfg.idIntegradora,
  });
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: authToken },
  });
  const data = await readResponseData(res);
  if (res.status !== 200) {
    const msg = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Falha ao buscar produtos (status ${res.status}): ${msg.slice(0, 500)}`);
  }
  return unwrapList(data);
}

export async function fetchAllCategorias(authToken) {
  const cfg = getBackendConfig();
  ensureCfg(cfg);
  const url = buildUrl(cfg.integrationBaseUrl, "/Servidor/webservice/integration/getListCategoria", {
    idIntegradora: cfg.idIntegradora,
  });
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: authToken },
  });
  const data = await readResponseData(res);
  if (res.status !== 200) {
    const msg = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Falha ao buscar categorias (status ${res.status}): ${msg.slice(0, 500)}`);
  }
  return unwrapList(data);
}
