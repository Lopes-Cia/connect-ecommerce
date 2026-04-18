import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

function safeString(value) {
  return String(value ?? "").trim()
}

function normalizeText(value) {
  return safeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
}

function slugify(value) {
  const s = normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
  return s || "item"
}

function toIntOrZero(value) {
  const n = Number.parseInt(String(value ?? "").trim(), 10)
  return Number.isFinite(n) ? n : 0
}

function toNumberOrNull(value) {
  const n = Number(String(value ?? "").trim())
  return Number.isFinite(n) ? n : null
}

function detectSizeLabel(text) {
  const t = normalizeText(text)
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg)\b/)
  if (!m) return ""
  const raw = safeString(m[1]).replace(",", ".")
  const qty = Number(raw)
  if (!Number.isFinite(qty)) return ""
  const unit = safeString(m[2]).toLowerCase()
  const isInt = Number.isInteger(qty)
  const qStr = isInt ? String(qty) : String(qty).replace(/\.0+$/, "")
  if (unit === "ml") return `${qStr}ml`
  if (unit === "l") return `${qStr}L`
  if (unit === "g") return `${qStr}g`
  if (unit === "kg") return `${qStr}kg`
  return `${qStr}${unit}`
}

function detectUnitLabel(text, codVol) {
  const t = normalizeText(text)
  if (t.includes("long neck")) return "long neck"
  if (t.includes("growler")) return "growler"
  if (t.includes("lata")) return "lata"
  if (t.includes("frasco")) return "frasco"
  if (t.includes("envelope")) return "envelope"
  if (t.includes("caixa")) return "caixa"
  const cv = normalizeText(codVol)
  return cv || "un"
}

function detectBadges(_text) {
  return []
}

function getArgValue(name) {
  const prefix = `${name}=`
  const found = process.argv.find((a) => a.startsWith(prefix))
  if (!found) return ""
  return found.slice(prefix.length).trim()
}

async function readJson(filePath, fallbackValue) {
  let raw = ""
  try {
    raw = await fs.readFile(filePath, "utf8")
  } catch {
    return fallbackValue
  }
  try {
    return JSON.parse(raw)
  } catch {
    return fallbackValue
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8")
}

function buildCategorySlugById(byId, id) {
  const visited = new Set()
  const segments = []
  let current = id
  while (current && !visited.has(current)) {
    visited.add(current)
    const c = byId.get(current)
    if (!c) break
    segments.push(slugify(c.name))
    current = toIntOrZero(c.parentId)
  }
  segments.reverse()
  const rest = segments.join("/")
  return `/categoria/${rest || "sem-categoria"}`
}

async function main() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  function resolveCliPath(cliValue, fallbackFromHere) {
    const v = safeString(cliValue)
    if (!v) return path.resolve(__dirname, fallbackFromHere)
    if (path.isAbsolute(v)) return v
    return path.resolve(process.cwd(), v)
  }

  const inLopesCategoriasJson = getArgValue("--in-lopes-categorias-json")
  if (inLopesCategoriasJson) {
    const inPath = resolveCliPath(inLopesCategoriasJson, "lopes.categorias.json")
    const raw = await readJson(inPath, [])
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
    const categoriesBody = items.map((c) => {
      const id = toIntOrZero(c?.codigo)
      const parentId = toIntOrZero(c?.codPai)
      const name = safeString(c?.categoria) || `Categoria ${id}`
      const image = safeString(c?.imagem) || "http://localhost:4000/assets/images/semImagem.png"
      const order = toIntOrZero(c?.sequencia) || id
      return { id, name, slug: "", parentId, image, order }
    })

    const byId = new Map(categoriesBody.map((c) => [toIntOrZero(c.id), c]))
    for (const c of categoriesBody) {
      c.slug = buildCategorySlugById(byId, toIntOrZero(c.id))
    }

    const categorias = categoriesBody.sort((a, b) => {
      const ap = toIntOrZero(a.parentId)
      const bp = toIntOrZero(b.parentId)
      if (ap !== bp) return ap - bp
      const ao = toIntOrZero(a.order)
      const bo = toIntOrZero(b.order)
      if (ao !== bo) return ao - bo
      return toIntOrZero(a.id) - toIntOrZero(b.id)
    })

    process.stdout.write(`${JSON.stringify(categorias, null, 2)}\n`)
    return
  }

  const inJ1 = resolveCliPath(getArgValue("--in-j1"), "..\\..\\..\\..\\MICROSERVICE\\LEAR_LOPES\\BACK\\endpoints\\prod\\j1.json")
  const inCatList = resolveCliPath(getArgValue("--in-cat-list"), "..\\..\\..\\..\\MICROSERVICE\\LEAR_LOPES\\BACK\\data\\CATEGORIA\\list.json")
  const inBrandList = getArgValue("--in-brand-list")
    ? resolveCliPath(getArgValue("--in-brand-list"), "brands.list.json")
    : ""

  const outDir = resolveCliPath(getArgValue("--out-dir"), "data")

  const outProdutos = path.resolve(outDir, "produtos.json")
  const outCategorias = path.resolve(outDir, "categorias.json")
  const outBrands = path.resolve(outDir, "brands.json")

  const brandFallback = {
    id: 0,
    name: "No Brand",
    slug: "/marca/no-brand",
    image: "http://localhost:4000/assets/images/semImagem.png",
  }

  const categoryFallbackId = 0
  const categoryFallback = {
    id: categoryFallbackId,
    name: "sem categoria",
    slug: "/categoria/sem-categoria",
    parentId: 0,
    image: "http://localhost:4000/assets/images/semImagem.png",
    order: 0,
  }

  const j1 = await readJson(inJ1, [])
  const items = Array.isArray(j1) ? j1 : Array.isArray(j1?.data) ? j1.data : []

  const produtos = items.map((it) => {
    const id = toIntOrZero(it?.codProd)
    const name = safeString(it?.descricaoEcomerce) || safeString(it?.descricaoErp) || `Produto ${id}`
    const baseSlug = slugify(name)
    const slug = `/produtos/${baseSlug}-${id}`

    const ean = safeString(it?.ean)
    const sku = ean && normalizeText(ean) !== "null" ? `${ean}-${id}` : `${baseSlug}-${id}`

    const unitLabel = detectUnitLabel(name, it?.codVol)
    const sizeLabel = detectSizeLabel(name)

    const price = toNumberOrNull(it?.preco)
    const stock = toIntOrZero(it?.qtEstoque)

    const catId = toIntOrZero(it?.categoriaPrinciapal)
    const category = {
      id: catId,
      name: "sem categoria",
      slug: "/categoria/sem-categoria",
      familia: [{ id: catId, name: "sem categoria", slug: "/categoria/sem-categoria" }],
    }

    const image = safeString(it?.imagem) || brandFallback.image

    return {
      id,
      sku,
      name,
      slug,
      unitLabel,
      sizeLabel,
      price,
      compareAtPrice: null,
      badges: detectBadges(name),
      image,
      stock,
      inStock: stock > 0,
      category,
      brand: brandFallback,
    }
  })

  const listRaw = await readJson(inCatList, [])
  const catItems = Array.isArray(listRaw) ? listRaw : Array.isArray(listRaw?.data) ? listRaw.data : []
  const categoriesBody = catItems.map((c) => {
    const id = toIntOrZero(c?.codigo)
    const parentId = toIntOrZero(c?.codPai)
    const name = safeString(c?.categoria) || `Categoria ${id}`
    const image = safeString(c?.imagem) || "http://localhost:4000/assets/images/semImagem.png"
    const order = toIntOrZero(c?.sequencia) || id
    return { id, name, slug: "", parentId, image, order }
  })

  const byId = new Map(categoriesBody.map((c) => [toIntOrZero(c.id), c]))
  for (const c of categoriesBody) {
    c.slug = buildCategorySlugById(byId, toIntOrZero(c.id))
  }

  const existingCategoriasRaw = await readJson(outCategorias, [])
  const existingCategorias = Array.isArray(existingCategoriasRaw) ? existingCategoriasRaw : []
  const categoriasById = new Map()
  for (const c of existingCategorias) {
    const id = toIntOrZero(c?.id)
    categoriasById.set(id, c)
  }
  categoriasById.set(0, categoryFallback)
  for (const c of categoriesBody) {
    const id = toIntOrZero(c?.id)
    categoriasById.set(id, c)
  }
  const categorias = Array.from(categoriasById.values()).sort((a, b) => {
    const ap = toIntOrZero(a.parentId)
    const bp = toIntOrZero(b.parentId)
    if (ap !== bp) return ap - bp
    const ao = toIntOrZero(a.order)
    const bo = toIntOrZero(b.order)
    if (ao !== bo) return ao - bo
    return toIntOrZero(a.id) - toIntOrZero(b.id)
  })

  const existingBrandsRaw = await readJson(outBrands, [])
  const existingBrands = Array.isArray(existingBrandsRaw) ? existingBrandsRaw : []

  const brandsById = new Map()
  for (const b of existingBrands) {
    const id = toIntOrZero(b?.id)
    brandsById.set(id, b)
  }
  brandsById.set(0, brandFallback)

  if (inBrandList) {
    const brandsRaw = await readJson(inBrandList, [])
    const bItems = Array.isArray(brandsRaw) ? brandsRaw : Array.isArray(brandsRaw?.data) ? brandsRaw.data : []
    for (const b of bItems) {
      const id = toIntOrZero(b?.id ?? b?.codigo ?? b?.codMarca)
      if (id === 0) continue
      const name = safeString(b?.name ?? b?.marca ?? b?.descricao) || `Brand ${id}`
      const slug = `/marca/${slugify(name)}`
      const image = safeString(b?.image ?? b?.imagem) || brandFallback.image
      brandsById.set(id, { id, name, slug, image })
    }
  }
  const brands = Array.from(brandsById.values()).sort((a, b) => toIntOrZero(a.id) - toIntOrZero(b.id))

  await writeJson(outProdutos, produtos)
  await writeJson(outCategorias, categorias)
  await writeJson(outBrands, brands)

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        inputs: { inJ1, inCatList, inBrandList: inBrandList || null },
        outputs: { outProdutos, outCategorias, outBrands },
        counts: { produtos: produtos.length, categorias: categorias.length, brands: brands.length },
      },
      null,
      2
    )}\n`
  )
}

main().catch((err) => {
  process.stderr.write(`${safeString(err?.message ?? err)}\n`)
  process.exitCode = 1
})
