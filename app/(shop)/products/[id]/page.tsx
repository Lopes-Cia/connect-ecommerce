import { notFound, redirect } from "next/navigation";
import { getIntegratedProductByCode } from "@/lib/integration/productsService";
import { toProductDetailViewModel } from "@/lib/products/viewModels";
import type { Product } from "@/lib/types/product";
import { slugify } from "@/lib/utils";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  redirect(`/products/${product.id}/${canonicalSlug}`);
}
