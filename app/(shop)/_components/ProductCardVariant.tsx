"use client";

import type { ProductCardType, ProductCardViewModel } from "@/lib/products/viewModels";

import ProductCard from "./ProductCard";
import ProductCardM2 from "./ProductCardM2";

type ProductCardVariantProps = {
  type: ProductCardType;
  product: ProductCardViewModel;
};

export default function ProductCardVariant({ type, product }: ProductCardVariantProps) {
  const variant = String(process.env.NEXT_PUBLIC_PRODUCT_CARD_VARIANT ?? "").trim().toLowerCase();
  const Card = variant === "m2" ? ProductCardM2 : ProductCard;
  return <Card type={type} product={product} />;
}

