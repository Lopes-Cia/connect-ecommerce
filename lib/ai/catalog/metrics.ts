export type CatalogOverview = {
  total: number;
  inStock: number;
  outOfStock: number;
  withImage: number;
  withoutImage: number;
  missingCategory: number;
  missingBrand: number;
  price: {
    min: number | null;
    max: number | null;
    median: number | null;
  };
  topCategories: Array<{ key: string; count: number }>;
  topBrands: Array<{ key: string; count: number }>;
};

export const CATALOG_METRICS_VERSION = 1 as const;

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s ? s : null;
}

function pickFirstString(values: unknown[]): string | null {
  for (const v of values) {
    const s = toStringValue(v);
    if (s) return s;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickImage(item: Record<string, unknown>): string | null {
  const direct = pickFirstString([item.imagem, item.image, item.img, item.foto]);
  if (direct) return direct;
  const imgs = item.imagens;
  if (Array.isArray(imgs)) {
    for (const v of imgs) {
      const s = toStringValue(v);
      if (s) return s;
    }
  }
  return null;
}

function pickStock(item: Record<string, unknown>): number | null {
  const byQt = toNumber(item.qtEstoque);
  if (byQt !== null) return byQt;
  const byIndice = toNumber(item.indiceEstoque);
  if (byIndice !== null) return byIndice;
  const byStock = toNumber(item.stock);
  if (byStock !== null) return byStock;
  return null;
}

function pickPrice(item: Record<string, unknown>): number | null {
  const byPreco = toNumber(item.preco);
  if (byPreco !== null) return byPreco;
  const byPrice = toNumber(item.price);
  if (byPrice !== null) return byPrice;
  const byVenda = toNumber(item.precoVenda);
  if (byVenda !== null) return byVenda;
  return null;
}

function pickCategoryKey(item: Record<string, unknown>): string | null {
  const categoryObj =
    item.category && typeof item.category === "object" && !Array.isArray(item.category)
      ? (item.category as Record<string, unknown>)
      : null;
  if (categoryObj) {
    const objId = toNumber(categoryObj.id) ?? toNumber(categoryObj.categoryId);
    if (objId === 0) return null;
    const objName = pickFirstString([categoryObj.name, categoryObj.nome]);
    if (objName) return objName;
    if (objId !== null) return String(objId);
  }
  const byName = pickFirstString([item.categoria, item.category, item.categoryName]);
  if (byName) return byName;
  const byId =
    toNumber(item.categoriaPrinciapal) ??
    toNumber(item.categoriaPrincipal) ??
    toNumber(item.categoryId);
  if (byId === null) return null;
  if (byId === 0) return null;
  return String(byId);
}

function pickBrandKey(item: Record<string, unknown>): string | null {
  const brandObj =
    item.brand && typeof item.brand === "object" && !Array.isArray(item.brand)
      ? (item.brand as Record<string, unknown>)
      : null;
  if (brandObj) {
    const objId = toNumber(brandObj.id) ?? toNumber(brandObj.brandId);
    const objName = pickFirstString([brandObj.name, brandObj.nome]);
    const norm = (objName ?? "").trim().toLowerCase();
    const isNoBrand = norm === "no brand" || norm === "sem marca";
    if (objId === 0 || isNoBrand) return null;
    if (objName) return objName;
    if (objId !== null) return String(objId);
  }
  const byName = pickFirstString([item.marca, item.brand, item.fabricante]);
  if (byName) return byName;
  return null;
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const a = sorted[mid - 1];
  const b = sorted[mid];
  if (typeof a !== "number" || typeof b !== "number") return null;
  return (a + b) / 2;
}

export function computeCatalogOverview(items: unknown[], topN = 10): CatalogOverview {
  let total = 0;
  let inStock = 0;
  let outOfStock = 0;
  let withImage = 0;
  let withoutImage = 0;
  let missingCategory = 0;
  let missingBrand = 0;
  const prices: number[] = [];
  const categoryCounts = new Map<string, number>();
  const brandCounts = new Map<string, number>();

  for (const raw of items) {
    const item = asRecord(raw);
    if (!item) continue;
    total += 1;

    const stock = pickStock(item);
    if (stock === null) {
      outOfStock += 1;
    } else if (stock > 0) {
      inStock += 1;
    } else {
      outOfStock += 1;
    }

    const image = pickImage(item);
    if (image) withImage += 1;
    else withoutImage += 1;

    const price = pickPrice(item);
    if (price !== null) prices.push(price);

    const categoryKey = pickCategoryKey(item);
    if (categoryKey) increment(categoryCounts, categoryKey);
    else missingCategory += 1;

    const brandKey = pickBrandKey(item);
    if (brandKey) increment(brandCounts, brandKey);
    else missingBrand += 1;
  }

  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const medianPrice = median(prices);

  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(0, topN))
    .map(([key, count]) => ({ key, count }));

  const topBrands = Array.from(brandCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(0, topN))
    .map(([key, count]) => ({ key, count }));

  return {
    total,
    inStock,
    outOfStock,
    withImage,
    withoutImage,
    missingCategory,
    missingBrand,
    price: { min: minPrice, max: maxPrice, median: medianPrice },
    topCategories,
    topBrands,
  };
}
