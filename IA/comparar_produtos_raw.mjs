import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function normalizeNumber(value) {
  if (value === null || value === undefined) return null
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const n = Number(trimmed.replace(",", "."))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function getId(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null
  const candidate =
    obj.codProd ?? obj.id ?? obj.codprod ?? obj.CodProd ?? obj.codigo ?? obj.productId ?? obj.cod_prod
  return normalizeNumber(candidate)
}

function getName(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return ""
  const candidate = obj.nomeProduto ?? obj.name ?? obj.descricaoErp ?? obj.descricao ?? obj.nome ?? ""
  return typeof candidate === "string" ? candidate.trim() : String(candidate)
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8")
  return JSON.parse(raw)
}

async function main() {
  const produtosPath = path.join(__dirname, "produtos.json")
  const rawPath = path.join(__dirname, "rawprodutos.json")
  const outPath = path.join(__dirname, "produtos-compare.json")

  const produtos = await readJson(produtosPath)
  const raw = await readJson(rawPath)

  const rawMap = new Map()
  for (const item of raw) {
    const id = getId(item)
    if (id === null) continue
    if (!rawMap.has(id)) rawMap.set(id, item)
  }

  const result = []
  const missing = []
  const idsProdutos = new Set()

  for (const item of produtos) {
    const id = getId(item)
    if (id !== null) idsProdutos.add(id)
    const found = id !== null ? rawMap.has(id) : false
    const row = {
      codProd: id,
      nomeProduto: getName(item),
      existsInRaw: found,
    }
    result.push(row)
    if (!found) missing.push(row)
  }

  const extraRaw = []
  for (const [id, item] of rawMap) {
    if (!idsProdutos.has(id)) {
      extraRaw.push({ id, name: getName(item) })
    }
  }

  const payload = {
    summary: {
      produtos: result.length,
      found: result.length - missing.length,
      missing: missing.length,
      extraRaw: extraRaw.length,
    },
    result,
    missing,
    extraRaw,
  }

  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
  console.log(JSON.stringify({ success: true, output: outPath, summary: payload.summary }, null, 2))
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exitCode = 1
})
