import { z } from "zod";
import { formatCurrency } from "@/lib/formatting";

export type ProdutoSpecViewModel = {
  label: string;
  value: string;
};

export type ProdutoBrandViewModel = {
  name: string;
  slug: string;
  image?: string | null;
};

export type ProdutoDetailViewModel = {
  id: string;
  name: string;
  category: string;
  brand?: ProdutoBrandViewModel;
  price: number;
  oldPrice?: number;
  images: string[];
  specs: ProdutoSpecViewModel[];
  shortDescription: string;
  ingredients: string;
  legalNotice: string;
  fullDescription: string;
  technicalSpecs: ProdutoSpecViewModel[];
  inStock: boolean;
};

const CategoriaFamiliaItemSchema = z
  .object({
    id: z.coerce.number().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
  })
  .passthrough();

const CategoriaSchema = z
  .object({
    id: z.coerce.number().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    familia: z.array(CategoriaFamiliaItemSchema).optional(),
  })
  .passthrough();

const BrandSchema = z
  .object({
    id: z.coerce.number().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    image: z.string().optional().nullable(),
  })
  .passthrough();

const ProdutoSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    sku: z.string().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    image: z.string().optional().nullable(),
    images: z.array(z.string()).optional(),
    imagens: z.array(z.unknown()).optional(),
    unitLabel: z.string().optional(),
    sizeLabel: z.string().optional(),
    qtUnitCaixa: z.coerce.number().nullable().optional(),
    qtUnit: z.coerce.number().nullable().optional(),
    price: z.coerce.number().optional(),
    compareAtPrice: z.coerce.number().nullable().optional(),
    stock: z.coerce.number().optional(),
    inStock: z.boolean().optional(),
    category: CategoriaSchema.optional(),
    categoryName: z.string().optional(),
    brand: z.union([BrandSchema, z.string()]).optional(),
  })
  .passthrough();

const FALLBACK_IMAGE = "/placeholder.svg";

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeSlugPath(value: unknown): string | null {
  const raw = normalizeText(value);
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  return raw;
}

function sanitizeUrl(value: string): string {
  let sanitized = value.trim();
  if (!sanitized) return "";
  if (sanitized.startsWith("(") && sanitized.endsWith(")")) {
    sanitized = sanitized.slice(1, -1).trim();
  }
  sanitized = sanitized.replace(/^[<"'\[\s]+/, "").replace(/[>"'\]\s]+$/, "");
  sanitized = sanitized.replace(/[),.;]+$/g, "");
  return sanitized.trim();
}

function toImageUrl(value: unknown): string {
  const normalized = typeof value === "string" ? sanitizeUrl(value) : normalizeText(value);
  if (!normalized) return FALLBACK_IMAGE;
  if (normalized.startsWith("/")) return normalized;
  if (normalized.startsWith("//")) return `https:${normalized}`;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
  return FALLBACK_IMAGE;
}

function toCategoryName(parsed: z.infer<typeof ProdutoSchema>): string {
  const categoryName = normalizeText(parsed.category?.name) || normalizeText(parsed.categoryName);
  if (categoryName) return categoryName;
  const familia = parsed.category?.familia ?? [];
  const last = familia.length ? familia[familia.length - 1] : null;
  const fromFamilia = normalizeText(last?.name);
  if (fromFamilia) return fromFamilia;
  return "Sem categoria";
}

function resolveBrandFromList(
  name: string,
  brands: { name?: unknown; slug?: unknown; image?: unknown }[] | null | undefined,
): ProdutoBrandViewModel | null {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return null;
  const list = Array.isArray(brands) ? brands : [];
  const found =
    list.find((b) => normalizeText(b.name).trim().toLowerCase() === normalizedName) ??
    list.find((b) => normalizeText(b.name).trim().toLowerCase().includes(normalizedName)) ??
    null;
  if (!found) return null;

  const slug = normalizeSlugPath(found.slug) ?? null;
  if (!slug) return null;

  return {
    name: normalizeText(found.name) || name,
    slug,
    image: typeof found.image === "string" ? found.image : null,
  };
}

export function toProdutoDetailViewModel(
  raw: unknown,
  opts?: { brands?: { name?: unknown; slug?: unknown; image?: unknown }[] | null },
): ProdutoDetailViewModel | null {
  const parsedResult = ProdutoSchema.safeParse(raw);
  if (!parsedResult.success) return null;
  const parsed = parsedResult.data;

  const id = String(parsed.id ?? "").trim();
  const name = normalizeText(parsed.name) || "Produto";
  const category = toCategoryName(parsed);

  const basePrice = Number.isFinite(parsed.price) ? (parsed.price as number) : 0;
  const compareAt = Number.isFinite(parsed.compareAtPrice ?? NaN) ? (parsed.compareAtPrice as number) : 0;
  const hasDiscount = compareAt > 0 && compareAt > basePrice;
  const oldPrice = hasDiscount ? compareAt : undefined;
  const price = basePrice;

  const stock = Number.isFinite(parsed.stock) ? (parsed.stock as number) : 0;
  const inStock = typeof parsed.inStock === "boolean" ? parsed.inStock && stock > 0 : stock > 0;

  const rawImages = [
    parsed.image,
    ...(Array.isArray(parsed.images) ? parsed.images : []),
    ...(Array.isArray(parsed.imagens) ? parsed.imagens : []),
  ];
  const images = [...new Set(rawImages.map(toImageUrl))].filter(Boolean);
  const normalizedImages = images.length ? images : [FALLBACK_IMAGE];

  let brand: ProdutoBrandViewModel | undefined;
  if (typeof parsed.brand === "string") {
    const found = resolveBrandFromList(parsed.brand, opts?.brands);
    if (found) brand = found;
  } else if (parsed.brand) {
    const brandName = normalizeText(parsed.brand.name);
    const brandSlug = normalizeSlugPath(parsed.brand.slug);
    if (brandName && brandSlug) {
      brand = { name: brandName, slug: brandSlug, image: parsed.brand.image ?? null };
    }
  }

  const unitLabel = normalizeText(parsed.unitLabel);
  const sizeLabel = normalizeText(parsed.sizeLabel);
  const sku = normalizeText(parsed.sku);

  const specs: ProdutoSpecViewModel[] = [
    { label: "Categoria", value: category },
    ...(brand ? [{ label: "Marca", value: brand.name }] : []),
    { label: "Unidade", value: unitLabel || "-" },
    { label: "Tamanho", value: sizeLabel || "-" },
    { label: "SKU", value: sku || "-" },
    { label: "Disponibilidade", value: inStock ? "Em estoque" : "Indisponível" },
    { label: "Estoque", value: stock > 0 ? String(stock) : "-" },
  ];

  const shortDescription = [brand?.name, category, unitLabel, sizeLabel].filter(Boolean).join(" · ") || name;

  const ingredients = "Informação indisponível para este produto.";
  const legalNotice =
    "As informações apresentadas são de responsabilidade do integrador. Consulte sempre a embalagem antes do consumo.";
  const fullDescription = `${name}${unitLabel ? ` (${unitLabel})` : ""}${sizeLabel ? ` ${sizeLabel}` : ""}.`;

  const technicalSpecs: ProdutoSpecViewModel[] = [
    { label: "Nome", value: name },
    ...(brand ? [{ label: "Marca", value: brand.name }] : []),
    { label: "Categoria", value: category },
    { label: "Código do produto", value: id || "-" },
    { label: "SKU", value: sku || "-" },
    { label: "Unidade", value: unitLabel || "-" },
    { label: "Tamanho", value: sizeLabel || "-" },
    { label: "Preço", value: formatCurrency(price) },
    ...(oldPrice != null ? [{ label: "Preço anterior", value: formatCurrency(oldPrice) }] : []),
    { label: "Disponibilidade", value: inStock ? "Em estoque" : "Indisponível" },
  ];

  return {
    id,
    name,
    category,
    brand,
    price,
    oldPrice,
    images: normalizedImages,
    specs,
    shortDescription,
    ingredients,
    legalNotice,
    fullDescription,
    technicalSpecs,
    inStock,
  };
}
