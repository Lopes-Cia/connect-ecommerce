"use client";

import { Package } from "lucide-react";
import ProductCard from "./ProductCard";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  discountPrice?: number;
  image_url: string;
}

interface SimpleProductListProps {
  subtitle: string;
  products: Product[];
}

export default function SimpleProductList({
  subtitle,
  products,
}: SimpleProductListProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-20 px-8">
      <div className="w-full max-w-7xl">
        {/* Subtitle Header */}
        <div className="flex items-center gap-2 mb-4 px-2">
          <Package className="w-5 h-5 text-tints-carbon-black" />
          <h2 className="text-tints-carbon-black font-montserrat font-normal text-sm uppercase">
            {subtitle}
          </h2>
        </div>

        {/* Product Grid */}
        <div className="grid place-content-center place-items-center grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              type={product.discountPrice ? "discount" : "standard"}
              product={product}
            />
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-8">
            <p className="text-tints-carbon-black font-montserrat text-sm">
              Nenhum produto encontrado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
