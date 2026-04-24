"use client";

import { Fragment, use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, FolderTree, SlidersHorizontal, ArrowDownUp } from "lucide-react";

import ProductCardVariant from "../../_components/ProductCardVariant";
import { useProdutosStore } from "@/stores/produtos-store";
import type { ProductCardViewModel } from "@/lib/products/viewModels";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UnknownRecord = Record<string, unknown>;
type CategoriaNode = { id: number; name: string; slug: string; children?: CategoriaNode[] };

type CatalogSortField = "id" | "name" | "price" | "stock" | "rank";
type CatalogSortDir = "asc" | "desc";
type CatalogQueryState = {
  page: number;
  sort: `${CatalogSortField}:${CatalogSortDir}`;
  inStock?: boolean;
  priceMin?: number;
  priceMax?: number;
};

const PAGE_SIZE = 24;
const DEFAULT_SORT: CatalogQueryState["sort"] = "rank:desc";

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
  const input = asString(value).trim();
  if (!input) return null;

  let decoded = input;
  try {
    decoded = decodeURIComponent(input);
  } catch {
    decoded = input;
  }

  let raw = decoded.trim().toLowerCase();
  if (!raw) return null;

  if (!raw.startsWith("/")) raw = `/${raw}`;

  raw = raw.replace(/\/{2,}/g, "/");
  raw = raw.replace(/\/+$/, "");
  if (!raw || raw === "/") return null;

  return raw;
}

function flattenCategorias(nodes: CategoriaNode[], out: CategoriaNode[] = []): CategoriaNode[] {
  for (const node of nodes) {
    out.push(node);
    if (Array.isArray(node.children) && node.children.length > 0) flattenCategorias(node.children, out);
  }
  return out;
}

function buildCategoriaSelectOptions(
  nodes: CategoriaNode[]
): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = [];

  function walk(current: CategoriaNode[], parents: string[]) {
    for (const node of current) {
      const name = String(node?.name ?? "").trim();
      const slug = normalizeSlugPath(node?.slug);
      const nextParents = name ? [...parents, name] : parents;

      if (slug) {
        out.push({
          value: slug,
          label: nextParents.join(" / ") || slug,
        });
      }

      const children = Array.isArray(node.children) ? node.children : [];
      if (children.length > 0) walk(children, nextParents);
    }
  }

  walk(nodes, []);
  return out;
}

function humanizeSlugSegment(segment: string): string {
  const raw = String(segment ?? "").trim().replace(/[-_]+/g, " ");
  if (!raw) return "";
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
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

function parseBoolOrNull(value: string | null): boolean | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function parseIntOrNull(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseNumberOrNull(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeSortOrError(
  value: string
): { sort: CatalogQueryState["sort"] } | { error: string } {
  const v = String(value || "").trim().toLowerCase();
  const [fieldRaw, dirRaw] = v.split(":");
  const field = (fieldRaw || "") as CatalogSortField;
  const dir = (dirRaw || "") as CatalogSortDir;

  const allowedFields = new Set<CatalogSortField>(["id", "name", "price", "stock", "rank"]);
  const allowedDirs = new Set<CatalogSortDir>(["asc", "desc"]);
  if (!allowedFields.has(field)) {
    return { error: 'Parâmetro "sort" inválido (campos: id,name,price,stock,rank).' };
  }
  if (!allowedDirs.has(dir)) {
    return { error: 'Parâmetro "sort" inválido (direções: asc,desc).' };
  }

  return { sort: `${field}:${dir}` as CatalogQueryState["sort"] };
}

function canonicalizeCatalogQuery(input: URLSearchParams): {
  canonical: URLSearchParams;
  state: CatalogQueryState;
  error: string | null;
} {
  const keys = new Set(["page", "sort", "inStock", "priceMin", "priceMax"]);
  const canonical = new URLSearchParams();

  for (const [k, v] of input.entries()) {
    if (!keys.has(k)) canonical.append(k, v);
  }

  const pageRaw = input.get("page");
  const pageParsed = parseIntOrNull(pageRaw);
  const pageSafe = pageParsed && pageParsed >= 1 ? pageParsed : 1;
  if (pageRaw !== null && (pageParsed === null || pageParsed < 1)) {
    console.warn('Query "page" inválida; canonicalizando para 1.', { pageRaw });
  }
  if (pageSafe !== 1) canonical.set("page", String(pageSafe));

  const sortRaw = input.get("sort");
  let sortSafe: CatalogQueryState["sort"] = DEFAULT_SORT;
  if (sortRaw) {
    const normalized = normalizeSortOrError(sortRaw);
    if ("error" in normalized) {
      return {
        canonical: new URLSearchParams(input.toString()),
        state: { page: pageSafe, sort: DEFAULT_SORT },
        error: normalized.error,
      };
    }
    sortSafe = normalized.sort;
  }
  if (sortRaw && sortSafe !== DEFAULT_SORT) canonical.set("sort", sortSafe);

  let inStock: boolean | undefined;
  if (input.has("inStock")) {
    const parsed = parseBoolOrNull(input.get("inStock"));
    if (parsed === null) {
      return {
        canonical: new URLSearchParams(input.toString()),
        state: { page: pageSafe, sort: sortSafe },
        error: 'Parâmetro "inStock" inválido (use true ou false).',
      };
    }
    inStock = parsed;
    canonical.set("inStock", String(parsed));
  }

  let priceMin: number | undefined;
  let priceMax: number | undefined;

  if (input.has("priceMin")) {
    const parsed = parseNumberOrNull(input.get("priceMin"));
    if (parsed === null) {
      return {
        canonical: new URLSearchParams(input.toString()),
        state: { page: pageSafe, sort: sortSafe, inStock },
        error: 'Parâmetro "priceMin" inválido (use um número).',
      };
    }
    priceMin = parsed;
    canonical.set("priceMin", String(parsed));
  }

  if (input.has("priceMax")) {
    const parsed = parseNumberOrNull(input.get("priceMax"));
    if (parsed === null) {
      return {
        canonical: new URLSearchParams(input.toString()),
        state: { page: pageSafe, sort: sortSafe, inStock, priceMin },
        error: 'Parâmetro "priceMax" inválido (use um número).',
      };
    }
    priceMax = parsed;
    canonical.set("priceMax", String(parsed));
  }

  if (typeof priceMin === "number" && typeof priceMax === "number" && priceMin > priceMax) {
    return {
      canonical: new URLSearchParams(input.toString()),
      state: { page: pageSafe, sort: sortSafe, inStock, priceMin, priceMax },
      error: 'Parâmetros inválidos: "priceMin" não pode ser maior que "priceMax".',
    };
  }

  return {
    canonical,
    state: { page: pageSafe, sort: sortSafe, inStock, priceMin, priceMax },
    error: null,
  };
}

export default function CategoriaPage({ params }: { params: Promise<{ slug: string[] | string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const unwrappedParams = use(params);

  const categoriasTree = useProdutosStore((s) => s.categoriasTree);
  const loadCategoriasTree = useProdutosStore((s) => s.loadCategoriasTree);
  const loadCategoriaBySlug = useProdutosStore((s) => s.loadCategoriaBySlug);

  const slugParts = Array.isArray(unwrappedParams.slug)
    ? unwrappedParams.slug
    : [unwrappedParams.slug].filter(Boolean);
  const slugPath = `/categoria/${slugParts.join("/")}`;

  const [categoria, setCategoria] = useState<CategoriaNode | null>(null);

  const [products, setProducts] = useState<ProductCardViewModel[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const catalogQuery = useMemo(() => {
    const raw = new URLSearchParams(searchParams.toString());
    return canonicalizeCatalogQuery(raw);
  }, [searchParams]);

  useEffect(() => {
    void loadCategoriasTree().catch((error) => {
      console.error("Falha ao carregar categorias (breadcrumb)", error);
    });
  }, [loadCategoriasTree]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);

    (async () => {
      try {
        if (catalogQuery.error) {
          setLoadError(catalogQuery.error);
          setProducts([]);
          setTotal(0);
          setTotalPages(0);
          return;
        }

        const current = searchParams.toString();
        const canonical = catalogQuery.canonical.toString();
        if (current !== canonical) {
          const href = canonical ? `${pathname}?${canonical}` : pathname;
          router.replace(href);
          return;
        }

        const categoriaResponse = await loadCategoriaBySlug({ slug: slugPath });
        const found = categoriaResponse?.category ?? null;
        if (!found || typeof found.id !== "number") {
          throw new Error("categoria_nao_encontrada");
        }

        const usp = new URLSearchParams();
        usp.set("categoryId", String(found.id));
        usp.set("page", String(catalogQuery.state.page));
        usp.set("pageSize", String(PAGE_SIZE));
        if (catalogQuery.state.sort !== DEFAULT_SORT) {
          usp.set("sort", catalogQuery.state.sort);
        }
        if (typeof catalogQuery.state.inStock === "boolean") {
          usp.set("inStock", String(catalogQuery.state.inStock));
        }
        if (typeof catalogQuery.state.priceMin === "number") {
          usp.set("priceMin", String(catalogQuery.state.priceMin));
        }
        if (typeof catalogQuery.state.priceMax === "number") {
          usp.set("priceMax", String(catalogQuery.state.priceMax));
        }

        const response = await fetch(`/api/catalog/products?${usp.toString()}`, { cache: "no-store" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
          const message =
            typeof payload?.message === "string" && payload.message.trim()
              ? payload.message.trim()
              : `Falha ao carregar produtos (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const result = (await response.json()) as {
          total?: unknown;
          page?: unknown;
          pageSize?: unknown;
          items?: unknown;
        };

        const itemsRaw = Array.isArray(result.items) ? result.items : [];
        const items = itemsRaw.map(toProductItem).filter(Boolean) as ProductCardViewModel[];
        const totalSafe = asNumber(result.total, items.length);
        const pageSizeSafe = asNumber(result.pageSize, PAGE_SIZE) || PAGE_SIZE;
        const totalPagesSafe = pageSizeSafe > 0 ? Math.ceil(totalSafe / pageSizeSafe) : 0;

        if (!active) return;

        setCategoria(found);
        setProducts(items);
        setTotal(totalSafe);
        setTotalPages(totalPagesSafe);
      } catch (error) {
        if (!active) return;

        const message = (() => {
          if (error instanceof Error && error.message === "categoria_nao_encontrada") return "Categoria não encontrada.";
          if (error instanceof Error && error.message.trim()) return error.message.trim();
          return "Não foi possível carregar a categoria agora.";
        })();
        setLoadError(message);
        console.error("Falha ao carregar categoria", { slugPath, error });
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [catalogQuery, loadCategoriaBySlug, pathname, router, searchParams, slugPath]);

  const breadcrumbItems = useMemo(() => {
    const normalizedTree = categoriasTree ?? [];
    const flat = normalizedTree.length > 0 ? flattenCategorias(normalizedTree) : [];

    const parts = slugParts
      .map((part) => String(part ?? "").trim())
      .filter(Boolean);

    const items = parts.map((_, index) => {
      const path = `/categoria/${parts.slice(0, index + 1).join("/")}`;
      const normalizedPath = normalizeSlugPath(path);
      const found = normalizedPath
        ? flat.find((node) => normalizeSlugPath(node.slug) === normalizedPath) ?? null
        : null;
      return {
        href: path,
        label: found?.name ?? humanizeSlugSegment(parts[index] ?? ""),
      };
    });

    return items.filter((it) => Boolean(it.label));
  }, [categoriasTree, slugParts]);

  const selectOptions = useMemo(() => {
    const tree = categoriasTree ?? [];
    const fromTree = buildCategoriaSelectOptions(tree);
    const semCategoriaOption = { value: "/categoria/sem-categoria", label: "Sem categoria" };
    if (fromTree.length > 0) return [semCategoriaOption, ...fromTree];

    if (!categoria) return [];
    const children = Array.isArray(categoria.children) ? categoria.children : [];
    const unique = [categoria, ...children].filter(
      (c, idx, arr) => arr.findIndex((it) => it.slug === c.slug) === idx
    );
    const opts = unique
      .map((c) => ({
        label: c.name,
        value: normalizeSlugPath(c.slug) ?? "",
      }))
      .filter((opt) => Boolean(opt.value));
    return opts.length > 0 ? [semCategoriaOption, ...opts] : [];
  }, [categoriasTree, categoria]);

  const displayedProducts = products;

  const page = catalogQuery.state.page;
  const canPrev = page > 1;
  const canNext = totalPages > 0 && page < totalPages;

  const heroTitle = categoria?.name ?? "Categoria";

  const currentCategoriaLabel = useMemo(() => {
    const current = normalizeSlugPath(categoria?.slug) ?? "";
    const found = selectOptions.find((opt) => opt.value === current);
    return found?.label ?? heroTitle;
  }, [categoria, heroTitle, selectOptions]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeof catalogQuery.state.inStock === "boolean") count += 1;
    if (typeof catalogQuery.state.priceMin === "number") count += 1;
    if (typeof catalogQuery.state.priceMax === "number") count += 1;
    return count;
  }, [catalogQuery.state.inStock, catalogQuery.state.priceMax, catalogQuery.state.priceMin]);

  const hasActiveFilters = activeFiltersCount > 0;
  const hasNonDefaultSort = catalogQuery.state.sort !== DEFAULT_SORT;

  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [filtersMenuOpen, setFiltersMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const updateUrlQuery = useCallback(
    (
      updates: Partial<{
        page: number;
        sort: CatalogQueryState["sort"] | undefined;
        inStock: boolean | undefined;
        priceMin: number | undefined;
        priceMax: number | undefined;
      }>,
      opts?: { resetPage?: boolean }
    ) => {
      const next = new URLSearchParams(searchParams.toString());

      if (opts?.resetPage) next.delete("page");

      if (typeof updates.page === "number") {
        if (updates.page <= 1) next.delete("page");
        else next.set("page", String(Math.floor(updates.page)));
      }

      if (typeof updates.sort === "string") {
        if (updates.sort === DEFAULT_SORT) next.delete("sort");
        else next.set("sort", updates.sort);
      } else if (updates.sort === undefined) {
      }

      if (typeof updates.inStock === "boolean") next.set("inStock", String(updates.inStock));
      if (updates.inStock === undefined && "inStock" in updates) next.delete("inStock");

      if (typeof updates.priceMin === "number") next.set("priceMin", String(updates.priceMin));
      if (updates.priceMin === undefined && "priceMin" in updates) next.delete("priceMin");

      if (typeof updates.priceMax === "number") next.set("priceMax", String(updates.priceMax));
      if (updates.priceMax === undefined && "priceMax" in updates) next.delete("priceMax");

      const { canonical, error } = canonicalizeCatalogQuery(next);
      if (error) {
        setLoadError(error);
        return;
      }

      const qs = canonical.toString();
      setLoadError(null);
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const sortMenuOptions = useMemo(
    () => [
      { value: DEFAULT_SORT, label: "Ordem" },
      { value: "price:asc" as const, label: "Menor preço" },
      { value: "price:desc" as const, label: "Maior preço" },
      { value: "name:asc" as const, label: "A–Z" },
      { value: "name:desc" as const, label: "Z–A" },
    ],
    []
  );

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

  const HeroSection = () => (
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
                <BreadcrumbLink asChild>
                  <Link href="/categorias" className="hover:text-custom-dark-1000">
                    Categorias
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                return (
                  <Fragment key={item.href}>
                    <BreadcrumbSeparator className="text-custom-dark-700/60" />
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className="text-custom-dark-1000">
                          {heroTitle}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={item.href} className="hover:text-custom-dark-1000">
                            {item.label}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-custom-dark-1000 text-3xl md:text-4xl font-league-spartan font-bold tracking-tight">
            {heroTitle}
          </h1>
          <p className="mt-1 text-custom-dark-700 font-montserrat text-sm md:text-base">
            Exibindo {displayedProducts.length} de {total} produtos
          </p>
        </div>
      </div>
    </section>
  );

  const FiltersToolbar = () => (
    <section className="px-4 md:px-6 -mt-6 md:-mt-8 relative z-10">
      <div className="max-w-7xl mx-auto rounded-lg border border-custom-light-300 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="p-5 md:p-6 flex items-center justify-center">
          <div className="w-full lg:w-auto">
            <div className="inline-flex w-full sm:w-auto items-stretch justify-center overflow-hidden rounded-full bg-white/70 backdrop-blur-sm">
              <DropdownMenu open={categoryMenuOpen} onOpenChange={setCategoryMenuOpen}>
                <DropdownMenuTrigger
                  onClick={() => setCategoryMenuOpen((value) => !value)}
                  disabled={!categoria || selectOptions.length <= 1}
                  aria-label="Categoria"
                  className="h-11 px-4 bg-transparent text-custom-dark-1000 inline-flex items-center gap-2 outline-none transition-colors hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-tints-french-blue focus-visible:ring-opacity-20 disabled:opacity-60 rounded-full"
                >
                  <FolderTree className="size-5 text-custom-dark-700" />
                  <span className="hidden md:inline max-w-[220px] truncate font-montserrat text-sm">
                    {currentCategoriaLabel}
                  </span>
                  <ChevronDown className="size-5 text-custom-light-600" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[20rem] max-h-[60vh] overflow-auto">
                  <DropdownMenuLabel>Categoria</DropdownMenuLabel>
                  {selectOptions.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onSelect={() => {
                        if (opt.value) router.push(opt.value);
                      }}
                    >
                      <span className="truncate">{opt.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu open={filtersMenuOpen} onOpenChange={setFiltersMenuOpen}>
                <DropdownMenuTrigger
                  onClick={() => setFiltersMenuOpen((value) => !value)}
                  aria-label="Filtros"
                  className="relative h-11 px-4 bg-transparent text-custom-dark-1000 inline-flex items-center gap-2 outline-none transition-colors hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-tints-french-blue focus-visible:ring-opacity-20 rounded-full"
                >
                  <SlidersHorizontal className="size-5 text-custom-dark-700" />
                  <span className="hidden md:inline font-montserrat text-sm">Filtros</span>
                  {hasActiveFilters && (
                    <span className="absolute right-2 top-2 inline-flex size-2 rounded-full bg-tints-french-blue" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[20rem]">
                <DropdownMenuLabel>Disponibilidade</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={
                    typeof catalogQuery.state.inStock === "boolean" ? String(catalogQuery.state.inStock) : "all"
                  }
                  onValueChange={(value) => {
                    updateUrlQuery({ inStock: value === "all" ? undefined : value === "true" }, { resetPage: true });
                  }}
                >
                  <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="true">Em estoque</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="false">Indisponível</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Preço</DropdownMenuLabel>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-default focus:bg-transparent">
                  <div className="w-full space-y-2 px-1 py-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700">
                          Min
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={typeof catalogQuery.state.priceMin === "number" ? catalogQuery.state.priceMin : ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            updateUrlQuery({ priceMin: raw === "" ? undefined : Number(raw) }, { resetPage: true });
                          }}
                          className="mt-1 w-full h-9 px-2 rounded-md border border-custom-light-400 bg-white text-custom-dark-1000 font-montserrat text-sm focus:outline-none focus:border-tints-french-blue focus:ring-2 focus:ring-tints-french-blue focus:ring-opacity-20"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700">
                          Max
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={typeof catalogQuery.state.priceMax === "number" ? catalogQuery.state.priceMax : ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            updateUrlQuery({ priceMax: raw === "" ? undefined : Number(raw) }, { resetPage: true });
                          }}
                          className="mt-1 w-full h-9 px-2 rounded-md border border-custom-light-400 bg-white text-custom-dark-1000 font-montserrat text-sm focus:outline-none focus:border-tints-french-blue focus:ring-2 focus:ring-tints-french-blue focus:ring-opacity-20"
                        />
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={sortMenuOpen} onOpenChange={setSortMenuOpen}>
              <DropdownMenuTrigger
                onClick={() => setSortMenuOpen((value) => !value)}
                aria-label="Ordenar"
                  className="relative h-11 px-4 bg-transparent text-custom-dark-1000 inline-flex items-center gap-2 outline-none transition-colors hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-tints-french-blue focus-visible:ring-opacity-20 rounded-full"
              >
                  <ArrowDownUp className="size-5 text-custom-dark-700" />
                <span className="hidden md:inline font-montserrat text-sm">
                  {sortMenuOptions.find((opt) => opt.value === catalogQuery.state.sort)?.label ?? "Ordenar"}
                </span>
                {hasNonDefaultSort && (
                  <span className="absolute right-2 top-2 inline-flex size-2 rounded-full bg-tints-french-blue" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[16rem]">
                <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={catalogQuery.state.sort}
                  onValueChange={(value) => {
                    updateUrlQuery({ sort: value as CatalogQueryState["sort"] }, { resetPage: true });
                  }}
                >
                  {sortMenuOptions.map((opt) => (
                    <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const ProductsSection = () => (
    <section className="px-4 md:px-6 pt-6 pb-10">
      <div className="max-w-7xl mx-auto">
        {isLoading && (
          <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-white/70">
            <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">
              Carregando produtos...
            </p>
          </div>
        )}

        {loadError && !isLoading && (
          <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-white/70">
            <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">
              {loadError}
            </p>
          </div>
        )}

        {!isLoading && !loadError && displayedProducts.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {displayedProducts.map((product) => (
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
                        <span
                          key={`ellipsis-${index}`}
                          className="px-1 text-custom-dark-700 font-montserrat text-sm"
                        >
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
        )}

        {!isLoading && !loadError && displayedProducts.length === 0 && (
          <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-white/70">
            <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">
              Nenhum produto encontrado com os filtros atuais.
            </p>
            <p className="text-custom-dark-700 font-montserrat text-sm mt-1">
              Tente ajustar os filtros.
            </p>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-linear-to-b from-custom-light-100 via-custom-light-200 to-custom-light-300">
      <HeroSection />
      <FiltersToolbar />
      <ProductsSection />
    </div>
  );
}
