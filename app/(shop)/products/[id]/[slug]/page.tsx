import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ImageViewer from "../_components/ImageViewer";
import ProductSummary from "../_components/ProductSummary";
import ProductActivity from "../_components/ProductActivity";
import ProductInfo from "../_components/ProductInfo";
import { getIntegratedProductByCode } from "@/lib/integration/productsService";
import { toProductDetailViewModel } from "@/lib/products/viewModels";
import type { Product } from "@/lib/types/product";
import { slugify } from "@/lib/utils";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id, slug } = await params;
  const codProd = Number.parseInt(id, 10);

  if (Number.isNaN(codProd)) {
    notFound();
  }

  let integratedProduct: Product | null = null;

  try {
    integratedProduct = await getIntegratedProductByCode(codProd);
  } catch {
    notFound();
  }

  if (!integratedProduct) {
    notFound();
  }

  const product = toProductDetailViewModel(integratedProduct);
  const canonicalSlug = slugify(product.name) || "produto";
  const canonicalId = product.id;

  if (id !== canonicalId || slug !== canonicalSlug) {
    redirect(`/products/${canonicalId}/${canonicalSlug}`);
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 py-6 bg-white">
      <nav className="flex items-center gap-1 text-xs font-montserrat text-custom-light-600 mb-6">
        <Link href="/" className="hover:text-custom-dark-1000 transition-colors">
          Início
        </Link>
        <ChevronRight className="size-3" />
        <Link href="/products" className="hover:text-custom-dark-1000 transition-colors">
          Produtos
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-custom-dark-1000">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-5 py-4 px-4 bg-custom-light-100 border border-custom-light-400 rounded-md flex items-center justify-center min-w-0">
          <ImageViewer images={product.images} productName={product.name} />
        </div>

        <div className="lg:col-span-4 bg-custom-light-100 border border-custom-light-400 rounded-md p-6">
          <ProductSummary
            name={product.name}
            shop={product.shop}
            price={product.price}
            oldPrice={product.oldPrice}
            specs={product.specs}
            description={product.shortDescription}
          />
        </div>

        <div className="lg:col-span-3">
          <ProductActivity
            price={product.price}
            oldPrice={product.oldPrice}
            productId={product.id}
            productName={product.name}
            productImageUrl={product.images[0]}
            productCategory={product.category}
            inStock={product.inStock}
          />
        </div>
      </div>

      <div className="max-w-4xl">
        <ProductInfo
          ingredients={product.ingredients}
          legalNotice={product.legalNotice}
          fullDescription={product.fullDescription}
          technicalSpecs={product.technicalSpecs}
        />
      </div>
    </div>
  );
}
