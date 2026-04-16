"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useProdutosStore } from "@/stores/produtos-store";
import ImageViewer from "../_components/ImageViewer";
import ProductActivity from "../_components/ProductActivity";
import ProductInfo from "../_components/ProductInfo";
import ProductSummary from "../_components/ProductSummary";
import BrandBlock from "../_components/BrandBlock";
import { toProdutoDetailViewModel } from "@/lib/produtos/viewModels";

export default function ProdutoClient({ slugPath }: { slugPath: string }) {
  const loadProdutoBySlug = useProdutosStore((s) => s.loadProdutoBySlug);
  const loadBrands = useProdutosStore((s) => s.loadBrands);

  const [rawProduct, setRawProduct] = useState<unknown>(null);
  const [rawBrands, setRawBrands] = useState<unknown[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    return toProdutoDetailViewModel(rawProduct, { brands: rawBrands });
  }, [rawBrands, rawProduct]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 md:px-6 py-6 bg-white">
        <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-custom-light-100">
          <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (loadError || !view) {
    return (
      <div className="container mx-auto px-2 sm:px-4 md:px-6 py-6 bg-white">
        <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-custom-light-100">
          <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">
            {loadError ?? "Produto não encontrado."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 py-6 bg-white">
      <nav className="flex items-center gap-1 text-xs font-montserrat text-custom-light-600 mb-6">
        <Link href="/" className="hover:text-custom-dark-1000 transition-colors">
          Início
        </Link>
        <ChevronRight className="size-3" />
        <Link href="/categorias" className="hover:text-custom-dark-1000 transition-colors">
          Categorias
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-custom-dark-1000">{view.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-5 py-4 px-4 bg-custom-light-100 border border-custom-light-400 rounded-md flex items-center justify-center min-w-0">
          <ImageViewer images={view.images} productName={view.name} />
        </div>

        <div className="lg:col-span-4 bg-custom-light-100 border border-custom-light-400 rounded-md p-6">
          <div className="flex flex-col gap-4">
            {view.brand ? <BrandBlock brand={view.brand} /> : null}
            <ProductSummary
              name={view.name}
              price={view.price}
              oldPrice={view.oldPrice}
              specs={view.specs}
              description={view.shortDescription}
            />
          </div>
        </div>

        <div className="lg:col-span-3">
          <ProductActivity
            price={view.price}
            oldPrice={view.oldPrice}
            productId={view.id || undefined}
            productName={view.name}
            productImageUrl={view.images[0]}
            productCategory={view.category}
            inStock={view.inStock}
          />
        </div>
      </div>

      <div className="max-w-4xl">
        <ProductInfo
          ingredients={view.ingredients}
          legalNotice={view.legalNotice}
          fullDescription={view.fullDescription}
          technicalSpecs={view.technicalSpecs}
        />
      </div>
    </div>
  );
}
