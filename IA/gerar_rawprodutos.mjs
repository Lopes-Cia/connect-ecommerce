import { existsSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const __root = path.resolve(__dirname, "..")

function parseEnvLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("#")) return null

  const idx = trimmed.indexOf("=")
  if (idx <= 0) return null

  const key = trimmed.slice(0, idx).trim()
  let value = trimmed.slice(idx + 1).trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  if (!key) return null
  return { key, value }
}

async function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const raw = await readFile(filePath, "utf8")
  const lines = raw.split(/\r?\n/)
  for (const line of lines) {
    const parsed = parseEnvLine(line)
    if (!parsed) continue
    if (process.env[parsed.key] !== undefined) continue
    process.env[parsed.key] = parsed.value
  }
}

async function loadEnv() {
  const candidates = [
    path.join(__root, ".env"),
    path.join(__root, ".env.local"),
    path.join(__root, ".env.development"),
    path.join(__root, ".env.development.local"),
    path.join(__root, ".env.production"),
    path.join(__root, ".env.production.local"),
  ]

  for (const filePath of candidates) {
    await loadEnvFile(filePath)
  }
}

function readEnv(name) {
  const v = process.env[name]
  if (v === undefined || v === null) return ""
  return String(v).trim()
}

function normalizeString(value) {
  if (!value) return ""

  const trimmed = String(value).trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function ensureCfg(cfg) {
  if (!cfg.authBaseUrl) throw new Error("AUTH_BASE_URL/BACK_AUTH_BASE_URL ausente.")
  if (!cfg.integrationBaseUrl) throw new Error("INTEGRATION_URL_API_BACK/INTEGRATION_URL_API ausente.")
  if (!cfg.idIntegradora) throw new Error("ID_INTEGRADORA/IDINTEGRADORA ausente.")
  if (!cfg.codCli) throw new Error("COD_CLI/CODCLI ausente.")
  if (!cfg.produto) throw new Error("PRODUTO ausente.")
  if (!cfg.ean) throw new Error("EAN ausente.")
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, "")
}

function readFirstEnv(keys) {
  for (const key of keys) {
    const value = normalizeString(process.env[key])
    if (value) return value
  }
  throw new Error(`Missing required environment variable. Tried: ${keys.join(", ")}`)
}

function parseRequiredNumber(keys) {
  const value = readFirstEnv(keys)
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable must be a valid integer: ${keys.join(", ")}`)
  }
  return parsed
}

function getBackendConfig() {
  const fonte = normalizeString(process.env.NEXT_PUBLIC_FONTE).toLowerCase()
  const integrationUrlKeys =
    fonte === "mock" ? ["INTEGRATION_URL_API_MOCK"] : ["INTEGRATION_URL_API_BACK", "INTEGRATION_URL_API"]

  return {
    authBaseUrl: normalizeBaseUrl(readFirstEnv(["BACK_AUTH_BASE_URL", "AUTH_BASE_URL"])),
    produto: readFirstEnv(["PRODUTO"]),
    ean: readFirstEnv(["EAN"]),
    integrationBaseUrl: normalizeBaseUrl(readFirstEnv(integrationUrlKeys)),
    idIntegradora: parseRequiredNumber(["ID_INTEGRADORA", "IDINTEGRADORA"]),
    codCli: parseRequiredNumber(["COD_CLI", "CODCLI"]),
  }
}

async function readResponseData(res) {
  const contentType = res.headers.get("content-type") || ""
  const text = await res.text()
  if (contentType.toLowerCase().includes("application/json")) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function ensureTokenResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Resposta inválida ao gerar token")
  }
  const obj = value
  if (typeof obj.hashToken !== "string" || typeof obj.dtExpira !== "string") {
    throw new Error("Resposta inválida ao gerar token")
  }
  return { hashToken: obj.hashToken, dtExpira: obj.dtExpira, refreshToken: obj.refreshToken ?? "" }
}

function buildUrl(base, pathname, query = {}) {
  const b = base.replace(/\/+$/, "")
  let p = pathname.startsWith("/") ? pathname : `/${pathname}`
  if (b.toLowerCase().endsWith("/servidor") && p.toLowerCase().startsWith("/servidor/")) {
    p = p.slice("/servidor".length)
  }
  const u = new URL(`${b}${p}`)
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue
    u.searchParams.set(k, String(v))
  }
  return u.toString()
}

function unwrapList(raw) {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object") {
    const obj = raw
    const candidates = [obj.data, obj.produtos, obj.products, obj.lista, obj.itens, obj.items]
    for (const c of candidates) {
      if (Array.isArray(c)) return c
    }
  }
  return []
}

async function fetchToken() {
  const cfg = getBackendConfig()
  ensureCfg(cfg)
  const url = `${cfg.authBaseUrl.replace(/\/+$/, "")}/tokenService`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto: cfg.produto,
      ean: cfg.ean,
      idIntegradora: cfg.idIntegradora,
      codCli: cfg.codCli,
    }),
  })
  const data = await readResponseData(res)
  if (res.status !== 200) {
    const msg = typeof data === "string" ? data : JSON.stringify(data)
    throw new Error(`Falha ao gerar token (status ${res.status}): ${msg.slice(0, 500)}`)
  }
  return ensureTokenResponse(data)
}

async function fetchAllProdutos(authToken) {
  const cfg = getBackendConfig()
  ensureCfg(cfg)
  const url = buildUrl(cfg.integrationBaseUrl, "/webservice/integration/getListProdutoLoja", {
    idIntegradora: cfg.idIntegradora,
  })
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: authToken },
  })
  const data = await readResponseData(res)
  if (res.status !== 200) {
    const msg = typeof data === "string" ? data : JSON.stringify(data)
    throw new Error(`Falha ao buscar produtos (status ${res.status}): ${msg.slice(0, 500)}`)
  }
  return unwrapList(data)
}

function printHelp() {
  const required = [
    "AUTH_BASE_URL (ou BACK_AUTH_BASE_URL)",
    "INTEGRATION_URL_API_BACK (ou INTEGRATION_URL_API)",
    "PRODUTO",
    "EAN",
    "ID_INTEGRADORA (ou IDINTEGRADORA)",
    "COD_CLI (ou CODCLI)",
  ]
  console.log(
    [
      "Gera IA/rawprodutos.json a partir do backend (getListProdutoLoja).",
      "",
      "Uso:",
      "  node IA/gerar_rawprodutos.mjs",
      "",
      "Env necessárias:",
      ...required.map((k) => `  - ${k}`),
    ].join("\n")
  )
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp()
    return
  }

  await loadEnv()
  const outFile = path.join(__dirname, "rawprodutos.json")
  const token = await fetchToken()
  const produtos = await fetchAllProdutos(token.hashToken)
  await writeFile(outFile, `${JSON.stringify(produtos, null, 2)}\n`, "utf8")
  console.log(JSON.stringify({ success: true, output: outFile, count: produtos.length }, null, 2))
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exitCode = 1
})
