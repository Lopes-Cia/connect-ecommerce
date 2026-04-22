import "server-only"

import type { Categoria, CategoriaNode } from "@/lib/types/produtos"

function safeString(value: unknown): string {
  return String(value ?? "").trim()
}

function toIntOrZero(value: unknown): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10)
  return Number.isFinite(n) ? n : 0
}

function slugify(value: unknown): string {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || "item"
}

type LopesCategoriaRaw = {
  codigo?: unknown
  codPai?: unknown
  categoria?: unknown
  imagem?: unknown
  sequencia?: unknown
}

function readListFrom(input: unknown): unknown[] {
  if (Array.isArray(input)) return input
  if (input && typeof input === "object" && Array.isArray((input as { data?: unknown }).data)) {
    return (input as { data: unknown[] }).data
  }
  return []
}

export function translateLopesCategoriasToCategorias(input: unknown): Categoria[] {
  const items = readListFrom(input) as LopesCategoriaRaw[]

  const categoryFallback: Categoria = {
    id: 0,
    name: "sem categoria",
    slug: "/categoria/sem-categoria",
    parentId: 0,
    image: "https://lopesecia.com.br/img/semImagem.png",
    order: 0,
  }

  const categoriesBody: Categoria[] = items
    .map((c) => {
    const id = toIntOrZero(c?.codigo)
    const parentId = toIntOrZero(c?.codPai)
    const name = safeString(c?.categoria) || `Categoria ${id}`
    const image = safeString(c?.imagem) || "https://lopesecia.com.br/img/semImagem.png"
    const order = toIntOrZero(c?.sequencia) || id

    return { id, name, slug: "", parentId, image, order }
    })
    .filter((c) => toIntOrZero(c.id) !== 0)

  const byId = new Map<number, Categoria>()
  byId.set(0, categoryFallback)
  for (const c of categoriesBody) byId.set(toIntOrZero(c.id), c)

  for (const c of categoriesBody) {
    const visited = new Set<number>()
    const segments: string[] = []
    let current = toIntOrZero(c.id)

    while (current && !visited.has(current)) {
      visited.add(current)
      const found = byId.get(current)
      if (!found) break
      segments.push(slugify(found.name))
      current = toIntOrZero(found.parentId)
    }

    segments.reverse()
    const rest = segments.join("/")
    c.slug = `/categoria/${rest || "sem-categoria"}`
  }

  const sorted = categoriesBody.sort((a, b) => {
    const ap = toIntOrZero(a.parentId)
    const bp = toIntOrZero(b.parentId)
    if (ap !== bp) return ap - bp

    const ao = toIntOrZero(a.order)
    const bo = toIntOrZero(b.order)
    if (ao !== bo) return ao - bo

    return toIntOrZero(a.id) - toIntOrZero(b.id)
  })

  return [categoryFallback, ...sorted]
}

export function buildCategoriasTreeFromCategorias(categorias: Categoria[]): CategoriaNode[] {
  const byId = new Map<number, Categoria>()
  const childrenByParent = new Map<number, Categoria[]>()

  for (const c of categorias) {
    const id = toIntOrZero(c?.id)
    if (id === 0) continue
    byId.set(id, c)

    const parentId = toIntOrZero(c?.parentId)
    const list = childrenByParent.get(parentId) ?? []
    list.push(c)
    childrenByParent.set(parentId, list)
  }

  for (const [, list] of childrenByParent) {
    list.sort((a, b) => {
      const ao = toIntOrZero(a?.order)
      const bo = toIntOrZero(b?.order)
      if (ao !== bo) return ao - bo
      return toIntOrZero(a?.id) - toIntOrZero(b?.id)
    })
  }

  const buildNode = (category: Categoria): CategoriaNode => {
    const id = toIntOrZero(category?.id)
    const children = (childrenByParent.get(id) ?? []).map(buildNode)
    return { ...category, children }
  }

  const roots = childrenByParent.get(0) ?? []
  return roots.map(buildNode)
}

export function translateLopesCategoriasToCategoriasTree(input: unknown): CategoriaNode[] {
  const categorias = translateLopesCategoriasToCategorias(input)
  return buildCategoriasTreeFromCategorias(categorias)
}
