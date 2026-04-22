import type { ProductCardType, ProductCardViewModel } from "@/lib/products/viewModels";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toImageUrl(value: unknown): string {
  const url = asString(value).trim();
  if (!url) return "/placeholder.svg";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  return "/placeholder.svg";
}

function isDiscount(compareAtPrice: number, price: number): boolean {
  return compareAtPrice > 0 && compareAtPrice > price;
}

function toCardType(inStock: boolean, hasDiscount: boolean): ProductCardType {
  if (!inStock) return "coming-soon";
  if (hasDiscount) return "discount";
  return "standard";
}

function normalizeProductHref(value: unknown): string {
  const raw = asString(value).trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  if (raw.startsWith("/produtos/")) return raw;

  if (raw.startsWith("/products/")) {
    const parts = raw.split("/").filter(Boolean);
    const last = parts.at(-1) ?? "";
    if (!last || last === "products") return "";
    return `/produtos/${last}`;
  }

  if (raw.startsWith("produtos/")) return `/${raw}`;
  if (raw.startsWith("products/")) {
    const parts = raw.split("/").filter(Boolean);
    const last = parts.at(-1) ?? "";
    if (!last || last === "products") return "";
    return `/produtos/${last}`;
  }

  if (raw.startsWith("/")) return raw;
  return `/produtos/${raw}`;
}

export type HomeBannerSlide = {
  id: string;
  src: string;
  alt: string;
  link: string;
};

export type HomeCategoryCardViewModel = {
  id: string;
  name: string;
  slug: string;
  image: string;
};

export function toHomeBannerSlides(homePayload: unknown): HomeBannerSlide[] {
  const home = asRecord(homePayload);
  const raw = asArray(home?.banners_1);
  return raw
    .map((item, index) => {
      const record = asRecord(item);
      if (!record) return null;
      const id = String(record.id ?? `banner-${index}`);
      const src = toImageUrl(record.image);
      return {
        id,
        src,
        alt: `Banner ${index + 1}`,
        link: asString(record.link),
      } as HomeBannerSlide;
    })
    .filter((item): item is HomeBannerSlide => Boolean(item));
}

export function toHomeCategoryCards(homePayload: unknown): HomeCategoryCardViewModel[] {
  const home = asRecord(homePayload);
  const raw = asArray(home?.categorias_destaque);
  return raw
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const id = String(record.id ?? "");
      const name = asString(record.name, "Categoria");
      if (!id) return null;
      return {
        id,
        name,
        slug: asString(record.slug),
        image: toImageUrl(record.image),
      } as HomeCategoryCardViewModel;
    })
    .filter((item): item is HomeCategoryCardViewModel => Boolean(item));
}

function toProductCardsFromSection(section: unknown): ProductCardViewModel[] {
  const sectionRecord = asRecord(section);
  const list = asArray(sectionRecord?.data);
  return list
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const id = String(record.id ?? "");
      const name = asString(record.name, "Produto");
      if (!id || !name) return null;

      const price = asNumber(record.price, 0);
      const compareAtPrice = asNumber(record.compareAtPrice, 0);
      const inStock = Boolean(record.inStock);
      const categoryRecord = asRecord(record.category);
      const categoryName = asString(categoryRecord?.name, "Sem categoria");
      const hasDiscount = isDiscount(compareAtPrice, price);

      const normalizedSlug = normalizeProductHref(record.slug);
      return {
        id,
        name,
        category: categoryName,
        price: hasDiscount ? compareAtPrice : price,
        discountPrice: hasDiscount ? price : undefined,
        image_url: toImageUrl(record.image),
        slug: normalizedSlug || undefined,
        cardType: toCardType(inStock, hasDiscount),
      } as ProductCardViewModel;
    })
    .filter((item): item is ProductCardViewModel => Boolean(item));
}

export function toHomeMaisVendidosProducts(homePayload: unknown): ProductCardViewModel[] {
  const home = asRecord(homePayload);
  return toProductCardsFromSection(home?.produtos_maisvendidos);
}

export function toHomePromocaoProducts(homePayload: unknown): ProductCardViewModel[] {
  const home = asRecord(homePayload);
  return toProductCardsFromSection(home?.produtos_promocao);
}
