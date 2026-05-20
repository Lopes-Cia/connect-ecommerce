"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import ProductCardVariant from "../_components/ProductCardVariant";
import type { ProductCardViewModel } from "@/lib/products/viewModels";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type UnknownRecord = Record<string, unknown>;

const PAGE_SIZE = 24;

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

function parseIntOrNull(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function BuscaPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" />}>
      <BuscaPageInner />
    </Suspense>
  );
}

function BuscaPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = useMemo(() => (searchParams.get("q") ?? "").trim(), [searchParams]);
  const page = useMemo(() => {
    const raw = parseIntOrNull(searchParams.get("page"));
    return raw && raw >= 1 ? raw : 1;
  }, [searchParams]);

  const [products, setProducts] = useState<ProductCardViewModel[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    if (!q) {
      setProducts([]);
      setTotal(0);
      setTotalPages(0);
      setIsLoading(false);
      setLoadError(null);
      return () => {
        active = false;
        controller.abort();
      };
    }

    setIsLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const usp = new URLSearchParams();
        usp.set("q", q);
        usp.set("page", String(page));
        usp.set("pageSize", String(PAGE_SIZE));
        usp.set("sort", "rank:desc");

        const response = await fetch(`/api/catalog/products?${usp.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
          const message =
            typeof payload?.message === "string" && payload.message.trim()
              ? payload.message.trim()
              : "Não foi possível carregar os resultados agora.";
          throw new Error(message);
        }

        const result = (await response.json().catch(() => null)) as UnknownRecord | null;
        const itemsRaw = Array.isArray(result?.items) ? result?.items : [];
        const items = itemsRaw.map(toProductItem).filter(Boolean) as ProductCardViewModel[];

        const totalSafe = asNumber(result?.total, items.length);
        const pageSizeSafe = asNumber(result?.pageSize, PAGE_SIZE) || PAGE_SIZE;
        const totalPagesSafe = pageSizeSafe > 0 ? Math.ceil(totalSafe / pageSizeSafe) : 0;

        if (!active) return;

        setProducts(items);
        setTotal(totalSafe);
        setTotalPages(totalPagesSafe);
      } catch (error) {
        if (!active) return;

        const message =
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : "Não foi possível carregar os resultados agora.";
        setLoadError(message);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [page, q]);

  const paginationItems = useMemo(() => {
    const totalSafe = Math.max(0, Math.floor(totalPages));
    if (totalSafe <= 1) return [] as Array<number | "...">;

    const current = Math.min(Math.max(1, Math.floor(page)), totalSafe);
    if (totalSafe <= 7) return Array.from({ length: totalSafe }, (_, idx) => idx + 1);

    const items: Array<number | "..."> = [];

    const pushPage = (value: number) => {
      if (items.includes(value)) return;
      items.push(value);
    };

    const pushEllipsis = () => {
      if (items[items.length - 1] === "...") return;
      items.push("...");
    };

    if (current <= 3) {
      pushPage(1);
      pushPage(2);
      pushPage(3);
      pushPage(4);
      pushEllipsis();
      pushPage(totalSafe);
      return items;
    }

    if (current >= totalSafe - 2) {
      pushPage(1);
      pushEllipsis();
      pushPage(totalSafe - 3);
      pushPage(totalSafe - 2);
      pushPage(totalSafe - 1);
      pushPage(totalSafe);
      return items;
    }

    pushPage(1);
    pushEllipsis();
    pushPage(current - 1);
    pushPage(current);
    pushPage(current + 1);
    pushEllipsis();
    pushPage(totalSafe);
    return items;
  }, [page, totalPages]);

  const canPrev = page > 1;
  const canNext = totalPages > 0 && page < totalPages;

  function updateUrlQuery(updates: { page?: number }) {
    const next = new URLSearchParams(searchParams.toString());
    if (!q) {
      router.push("/busca");
      return;
    }

    next.set("q", q);
    if (typeof updates.page === "number") {
      const safe = updates.page >= 1 ? updates.page : 1;
      if (safe === 1) next.delete("page");
      else next.set("page", String(safe));
    }

    const qs = next.toString();
    router.push(qs ? `/busca?${qs}` : "/busca");
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-custom-light-100 via-custom-light-200 to-custom-light-300">
      <section className="w-full bg-custom-light-300">
        <div className="px-4 md:px-6 py-10 md:py-14">
          <div className="max-w-7xl mx-auto">
            <Breadcrumb className="mb-4">
              <BreadcrumbList className="text-xs font-montserrat text-custom-dark-700">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/" className="hover:text-custom-dark-1000">
                      Início
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-custom-dark-700/60" />
                <BreadcrumbItem>
                  {q ? (
                    <BreadcrumbLink asChild>
                      <Link href="/busca" className="hover:text-custom-dark-1000">
                        Busca
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="text-custom-dark-1000">Busca</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {q ? (
                  <Fragment>
                    <BreadcrumbSeparator className="text-custom-dark-700/60" />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-custom-dark-1000">{q}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </Fragment>
                ) : null}
              </BreadcrumbList>
            </Breadcrumb>

            <h1 className="text-3xl md:text-4xl font-league-spartan font-bold text-custom-dark-1000">
              Busca
            </h1>
            <p className="text-custom-dark-700 font-montserrat text-sm md:text-base mt-2">
              {q ? `Resultados para “${q}”.` : "Digite no campo de busca para pesquisar em toda a loja."}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 md:px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          {loadError && !isLoading ? (
            <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-white/70">
              <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">{loadError}</p>
            </div>
          ) : null}

          {!loadError && !isLoading && q && (
            <p className="text-xs md:text-sm font-montserrat text-custom-dark-700 mb-4">
              Exibindo {products.length} de {total} produtos
            </p>
          )}

          {isLoading ? (
            <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-white/70">
              <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">Carregando…</p>
            </div>
          ) : null}

          {!isLoading && !loadError && q && products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {products.map((product) => (
                  <ProductCardVariant
                    key={product.id}
                    type={product.cardType ?? (product.discountPrice ? "discount" : "standard")}
                    product={product}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <nav aria-label="Paginação" className="mt-10 flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateUrlQuery({ page: Math.max(1, page - 1) })}
                      disabled={!canPrev || isLoading}
                      aria-label="Página anterior"
                      className="h-10 w-10 rounded-md border border-custom-light-400 bg-white text-custom-dark-1000 font-montserrat text-sm disabled:opacity-60"
                    >
                      ‹
                    </button>

                    {paginationItems.map((item, index) => {
                      if (item === "...") {
                        return (
                          <span key={`ellipsis-${index}`} className="px-1 text-custom-dark-700 font-montserrat text-sm">
                            …
                          </span>
                        );
                      }

                      const isActive = item === page;
                      return (
                        <button
                          key={item}
                          onClick={() => updateUrlQuery({ page: item })}
                          aria-current={isActive ? "page" : undefined}
                          className={[
                            "h-10 w-10 rounded-md font-montserrat text-sm transition-colors",
                            isActive
                              ? "bg-tints-french-blue text-white border border-tints-french-blue"
                              : "bg-white text-custom-dark-1000 border border-custom-light-400 hover:bg-custom-light-200",
                          ].join(" ")}
                        >
                          {item}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => updateUrlQuery({ page: page + 1 })}
                      disabled={!canNext || isLoading}
                      aria-label="Próxima página"
                      className="h-10 w-10 rounded-md border border-custom-light-400 bg-white text-custom-dark-1000 font-montserrat text-sm disabled:opacity-60"
                    >
                      ›
                    </button>
                  </div>
                </nav>
              )}
            </>
          ) : null}

          {!isLoading && !loadError && q && products.length === 0 ? (
            <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-white/70">
              <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">
                Nenhum produto encontrado.
              </p>
              <p className="text-custom-dark-700 font-montserrat text-sm mt-1">Tente ajustar o termo de busca.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
