"use client"

import type { ProductCardType, ProductCardViewModel } from "@/lib/products/viewModels"

import { CardCompM2 } from "@/components/cards/cardCompM2"

interface ProductCardM2Props {
  type: ProductCardType
  product: ProductCardViewModel
}

export default function ProductCardM2({ type, product }: ProductCardM2Props) {
  return (
    <CardCompM2
      product={product}
      type={type}
      layout="options"
      showFavorite={true}
      showCategory={true}
      showOptionsSection={false}
      ctaLabel={type === "coming-soon" ? undefined : "Adicionar"}
    />
  )
}

