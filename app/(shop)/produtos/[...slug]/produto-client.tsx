"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useProdutosStore } from "@/stores/produtos-store";
import { useControlStore } from "@/stores/control-store";
import ImageViewer from "../_components/ImageViewer";
import ProductActivity from "../_components/ProductActivity";
import ProductSummary from "../_components/ProductSummary";
import ProductInfoTabs from "../_components/ProductInfoTabs";
import FreightConsult from "../_components/FreightConsult";
import { computeMaxQuantity, computePaleteValue } from "@/lib/produtos/paletePricing";
import { toProdutoDetailViewModel } from "@/lib/produtos/viewModels";
import ProductCarousel from "../../_components/ProductCarousel";
import type { ProductCardViewModel } from "@/lib/products/viewModels";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type BrandCandidate = { name?: unknown; slug?: unknown; image?: unknown };

function isBrandCandidate(value: unknown): value is BrandCandidate {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

type UnknownRecord = Record<string, unknown>;

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

function toRelatedProductCard(raw: unknown): ProductCardViewModel | null {
  const record = asRecord(raw);
  if (!record) return null;

  const id = String(record.id ?? "").trim();
  const name = asString(record.name, "").trim();
  if (!id || !name) return null;

  const categoryRecord = asRecord(record.category);
  const category = asString(categoryRecord?.name, asString(record.categoryName, "Sem categoria")).trim() || "Sem categoria";

  const price = asNumber(record.price, 0);
  const compareAt = asNumber(record.compareAtPrice, 0);
  const hasDiscount = compareAt > 0 && compareAt > price;

  const qtUnit = asNumber(record.qtUnit, 0);
  const qtPalete = asNumber(record.qtPalete, 0);
  const stock = asNumber(record.stock, 0);
  const maxQuantity = computeMaxQuantity(stock, qtPalete);
  const inStock = maxQuantity > 0;

  const image_url = asString(record.image, asString(record.image_url, "/placeholder.svg")) || "/placeholder.svg";
  const slug = asString(record.slug, "").trim() || undefined;

  return {
    id,
    name,
    category,
    price: hasDiscount ? compareAt : price,
    discountPrice: hasDiscount ? price : undefined,
    image_url,
    slug,
    cardType: inStock ? (hasDiscount ? "discount" : "standard") : "coming-soon",
    qtUnit: qtUnit > 0 ? qtUnit : null,
    qtPalete: qtPalete > 0 ? qtPalete : null,
    stock: stock > 0 ? stock : 0,
    paleteValue: computePaleteValue(price, qtPalete),
    maxQuantity,
  };
}

export default function ProdutoClient({ slugPath }: { slugPath: string }) {
  const loadProdutoBySlug = useProdutosStore((s) => s.loadProdutoBySlug);
  const loadBrands = useProdutosStore((s) => s.loadBrands);
  const loadProdutosByCategoria = useProdutosStore((s) => s.loadProdutosByCategoria);
  const useIaStore = useControlStore((s) => s.IASTORE);
  const setContratoData = useIaStore((s) => s.setContratoData);

  const [rawProduct, setRawProduct] = useState<unknown>(null);
  const [rawBrands, setRawBrands] = useState<unknown[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [relatedProducts, setRelatedProducts] = useState<ProductCardViewModel[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);



  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    setRawProduct(null);
    setRawBrands(null);

    (async () => {
      try {
        const [productResult, brandsResult] = await Promise.allSettled([
          loadProdutoBySlug({ slug: slugPath }),
          loadBrands(),
        ]);

        if (!active) return;

        if (productResult.status === "fulfilled") {
          setRawProduct(productResult.value as unknown);
        } else {
          throw productResult.reason;
        }

        if (brandsResult.status === "fulfilled") {
          const brands = Array.isArray(brandsResult.value) ? brandsResult.value : [];
          setRawBrands(brands as unknown[]);
        }
      } catch (error) {
        if (!active) return;
        setLoadError("Não foi possível carregar o produto agora.");
        console.error("Falha ao carregar produto", { slugPath, error });
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadBrands, loadProdutoBySlug, slugPath]);

  const view = useMemo(() => {
    if (!rawProduct) return null;
    const brands = Array.isArray(rawBrands) ? rawBrands.filter(isBrandCandidate) : undefined;
    return toProdutoDetailViewModel(rawProduct, { brands });
  }, [rawBrands, rawProduct]);

  useEffect(() => {
    setContratoData({ raw: rawProduct, view });
    return () => {
      setContratoData({ raw: null, view: null });
    };
  }, [rawProduct, setContratoData, view]);

  useEffect(() => {
    if (!view) return;

    console.log("[PDP] qtEstoque", {
      codProd: view.id,
      nome: view.name,
      qtEstoque: view.stock,
      qtPalete: view.qtPalete,
      maxQuantity: view.maxQuantity,
    });
  }, [view]);

  useEffect(() => {
    let active = true;

    const categoryId = view?.categoryId;
    if (!categoryId) {
      setRelatedProducts([]);
      setRelatedLoading(false);
      setRelatedError(null);
      return () => {
        active = false;
      };
    }

    setRelatedLoading(true);
    setRelatedError(null);

    (async () => {
      try {
        const response = await loadProdutosByCategoria({ idCategoria: categoryId, page: 1, pageSize: 12 });
        const items = Array.isArray(response?.data) ? response.data : [];
        const mapped = items.map(toRelatedProductCard).filter(Boolean) as ProductCardViewModel[];
        const filtered = mapped.filter((p) => p.id !== view?.id);
        if (!active) return;
        setRelatedProducts(filtered);
      } catch (error) {
        if (!active) return;
        setRelatedError("Não foi possível carregar recomendações agora.");
        setRelatedProducts([]);
        console.error("Falha ao carregar produtos relacionados", { categoryId, error });
      } finally {
        if (active) setRelatedLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadProdutosByCategoria, view?.categoryId, view?.id]);

  if (isLoading) {
    return (
      <div className="bg-white py-6 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-custom-light-100">
            <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">Carregando produto...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !view) {
    return (
      <div className="bg-white py-6 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-custom-light-100">
            <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">
              {loadError ?? "Produto não encontrado."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getSpecValue = (label: string) => {
    const found = view.specs.find((spec) => String(spec.label ?? "").trim() === label);
    return String(found?.value ?? "").trim();
  };
  const unitLabel = getSpecValue("Unidade") || undefined;
  const sku = getSpecValue("SKU") || undefined;
  const embalagemDescription =
    typeof view.qtUnit === "number" && Number.isFinite(view.qtUnit) && view.qtUnit > 0
      ? `Embalagem com ${view.qtUnit} Unidades`
      : undefined;
  const paleteDescription =
    typeof view.qtPalete === "number" && Number.isFinite(view.qtPalete) && view.qtPalete > 0
      ? `Palete com ${view.qtPalete} embalagens`
      : undefined;

  return (
    <div className="bg-white pt-6 pb-28 lg:pb-6 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <Breadcrumb className="mb-6">
          <BreadcrumbList className="text-xs font-montserrat text-custom-light-600">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="hover:text-custom-dark-1000 transition-colors">
                  Início
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-custom-light-600/60" />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/categorias" className="hover:text-custom-dark-1000 transition-colors">
                  Categorias
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-custom-light-600/60" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-custom-dark-1000">{view.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-6 min-w-0 bg-white">
            <ImageViewer images={view.images} productName={view.name} />
          </div>

          <div className="lg:col-span-6 flex flex-col gap-6">
            <ProductSummary
              name={view.name}
              category={view.category}
              description={embalagemDescription}
              secondaryDescription={paleteDescription}
              price={view.price}
              oldPrice={view.oldPrice}
              paleteValue={view.paleteValue}
              inStock={view.inStock}
              unitLabel={unitLabel}
              brand={view.brand ?? null}
            />

            <div className="lg:sticky lg:top-6 w-full">
              <ProductActivity
                price={view.price}
                oldPrice={view.oldPrice}
                productId={view.id || undefined}
                productName={view.name}
                productImageUrl={view.images[0]}
                productCategory={view.category}
                sku={sku}
                qtPalete={view.qtPalete}
                paleteValue={view.paleteValue}
                maxQuantity={view.maxQuantity}
                inStock={view.inStock}
                showHeaderPrice={false}
              />
            </div>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-10 md:gap-12">
          <div className="md:col-span-7">
            <ProductInfoTabs
              fullDescription={view.fullDescription}
              technicalSpecs={view.technicalSpecs}
            />
          </div>
          <aside className="md:col-span-3 space-y-4">
            <FreightConsult />
            <section className="space-y-4">
              <h2 className="text-custom-dark-1000 font-montserrat font-bold text-sm tracking-wide uppercase">
                Informações
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-custom-dark-1000 font-montserrat font-semibold text-xs">Ingredientes</h3>
                  <p className="text-custom-dark-700 font-montserrat text-xs leading-relaxed mt-1">{view.ingredients}</p>
                </div>
                <div>
                  <h3 className="text-custom-dark-1000 font-montserrat font-semibold text-xs">Aviso legal</h3>
                  <p className="text-custom-light-600 font-montserrat text-[10px] leading-relaxed mt-1">
                    {view.legalNotice}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-10">
          <h2 className="text-custom-dark-1000 font-league-spartan font-bold text-2xl mb-4">
            Você também pode gostar
          </h2>
          {relatedLoading ? (
            <div className="w-full py-10 text-center text-custom-dark-700 font-montserrat text-sm">
              Carregando recomendações...
            </div>
          ) : relatedError ? (
            <div className="w-full py-10 text-center text-custom-dark-700 font-montserrat text-sm">
              {relatedError}
            </div>
          ) : (
            <ProductCarousel products={relatedProducts} />
          )}
        </section>
      </div>
    </div>
  );
}
