"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import ProductCardVariant from "../../_components/ProductCardVariant";
import { useProdutosStore } from "@/stores/produtos-store";
import type { ProductCardViewModel } from "@/lib/products/viewModels";

type UnknownRecord = Record<string, unknown>;
type Brand = { id: number; name: string; slug: string };
type BrandByIdPayload = {
  brand: Brand;
  products?: { data?: unknown[]; page?: number; pageSize?: number; total?: number; totalPages?: number };
};

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSlugPath(value: unknown): string | null {
  const raw = asString(value).trim();
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  return raw;
}

function toProductItem(raw: unknown): ProductCardViewModel | null {
  const record = asRecord(raw);
  if (!record) return null;

  const id = String(record.id ?? "");
  const name = asString(record.name, "").trim();
  if (!id || !name) return null;

  const categoryRecord = asRecord(record.category);
  const categoryName = asString(categoryRecord?.name, asString(record.categoryName, "Sem categoria"));

  const price = asNumber(record.price, 0);
  const compareAtPrice = asNumber(record.compareAtPrice, 0);
  const hasDiscount = compareAtPrice > 0 && compareAtPrice > price;
  const inStock = Boolean(record.inStock ?? record.in_stock ?? true);

  const image_url = asString(record.image, asString(record.image_url, "/placeholder.svg"));
  const slug = normalizeSlugPath(record.slug);

  return {
    id,
    name,
    category: categoryName,
    price: hasDiscount ? compareAtPrice : price,
    discountPrice: hasDiscount ? price : undefined,
    image_url,
    slug: slug ?? undefined,
    cardType: inStock ? (hasDiscount ? "discount" : "standard") : "coming-soon",
  };
}

export default function MarcaPage({ params }: { params: { slug: string[] | string } }) {
  const router = useRouter();

  const loadBrands = useProdutosStore((s) => s.loadBrands);
  const loadBrandById = useProdutosStore((s) => s.loadBrandById);

  const unwrappedParams = use(params as unknown as Promise<{ slug: string[] | string }>);
  const slugParts = Array.isArray(unwrappedParams.slug)
    ? unwrappedParams.slug
    : [unwrappedParams.slug].filter(Boolean);
  const slugPath = `/marca/${slugParts.join("/")}`;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<ProductCardViewModel[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
    setSearchTerm("");
  }, [slugPath]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const allBrands = (await loadBrands()) as unknown as Brand[];
        const normalized = normalizeSlugPath(slugPath);
        const found =
          allBrands.find((b) => normalizeSlugPath(b.slug) === normalized) ?? null;
        if (!found) {
          throw new Error("marca_nao_encontrada");
        }

        const payload = (await loadBrandById({ idBrand: found.id, page, pageSize: 24 })) as unknown as BrandByIdPayload;
        const list = Array.isArray(payload?.products?.data) ? payload.products.data : [];
        const items = list.map(toProductItem).filter(Boolean) as ProductCardViewModel[];

        if (!active) return;

        setBrands(allBrands);
        setBrand(found);
        setProducts(items);
        setTotal(asNumber(payload?.products?.total, items.length));
        setTotalPages(asNumber(payload?.products?.totalPages, 0));
      } catch (error) {
        if (!active) return;

        const message =
          error instanceof Error && error.message === "marca_nao_encontrada"
            ? "Marca não encontrada."
            : "Não foi possível carregar a marca agora.";
        setLoadError(message);
        console.error("Falha ao carregar marca", { slugPath, error });
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadBrandById, loadBrands, page, slugPath]);

  const brandOptions = useMemo(() => {
    return brands
      .map((b) => ({ label: b.name, value: normalizeSlugPath(b.slug) ?? "" }))
      .filter((opt) => Boolean(opt.value));
  }, [brands]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => p.name.toLowerCase().includes(term));
  }, [products, searchTerm]);

  const handleClearFilter = () => {
    setSearchTerm("");
  };

  const canPrev = page > 1;
  const canNext = totalPages > 0 && page < totalPages;

  return (
    <div className="min-h-screen bg-linear-to-br from-custom-light-100 to-custom-light-300">
      <div className="px-4 md:px-6 pt-6 md:pt-8 pb-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-league-spartan font-bold text-custom-dark-1000 mb-2">
            {brand?.name ?? "Marca"}
          </h1>
          <p className="text-custom-dark-700 font-montserrat text-sm md:text-base">
            Explore os produtos desta marca.
          </p>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-3">
        <div className="max-w-7xl mx-auto rounded-xl border border-custom-light-300 bg-white p-4 md:p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 md:gap-4">
            <div className="w-full lg:max-w-sm">
              <label className="block mb-1 text-xs font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700">
                Marca
              </label>
              <select
                value={normalizeSlugPath(brand?.slug) ?? ""}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next) router.push(next);
                }}
                disabled={!brand || brandOptions.length === 0}
                className="w-full px-4 py-2.5 rounded-md border border-custom-light-400 bg-white text-custom-dark-1000 font-montserrat text-sm focus:outline-none focus:border-tints-french-blue focus:ring-2 focus:ring-tints-french-blue focus:ring-opacity-20 disabled:opacity-60"
              >
                {brandOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full lg:flex-1">
              <label className="block mb-1 text-xs font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700">
                Buscar produto
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-custom-light-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex.: Heineken, Vodka, Coca-Cola"
                  className="w-full pl-11 pr-3 py-2.5 rounded-md border border-custom-light-400 bg-white text-custom-dark-1000 font-montserrat text-sm placeholder:text-custom-light-600 focus:outline-none focus:border-tints-french-blue focus:ring-2 focus:ring-tints-french-blue focus:ring-opacity-20"
                />
              </div>
            </div>

            {searchTerm && (
              <button
                onClick={handleClearFilter}
                className="h-10.5 px-4 bg-tints-french-blue text-white font-montserrat font-semibold text-sm rounded-md hover:opacity-90 transition-opacity"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs md:text-sm font-montserrat text-custom-dark-700">
              Exibindo {filteredProducts.length} de {total} produtos
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!canPrev || isLoading}
                  className="h-10 px-3 rounded-md border border-custom-light-400 bg-white text-custom-dark-1000 font-montserrat text-sm disabled:opacity-60"
                >
                  Anterior
                </button>
                <span className="text-xs md:text-sm font-montserrat text-custom-dark-700">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!canNext || isLoading}
                  className="h-10 px-3 rounded-md border border-custom-light-400 bg-white text-custom-dark-1000 font-montserrat text-sm disabled:opacity-60"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4 md:py-6">
        <div className="max-w-7xl mx-auto">
          {isLoading && (
            <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-white/70 mt-4">
              <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">Carregando produtos...</p>
            </div>
          )}

          {loadError && !isLoading && (
            <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-white/70 mt-4">
              <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">{loadError}</p>
            </div>
          )}

          {!isLoading && !loadError && filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
              {filteredProducts.map((product) => (
                <ProductCardVariant
                  key={product.id}
                  type={product.cardType ?? (product.discountPrice ? "discount" : "standard")}
                  product={product}
                />
              ))}
            </div>
          )}

          {!isLoading && !loadError && filteredProducts.length === 0 && (
            <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-white/70 mt-4">
              <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">
                Nenhum produto encontrado com os filtros atuais.
              </p>
              <p className="text-custom-dark-700 font-montserrat text-sm mt-1">
                Tente ajustar o termo de busca.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
