"use client";

import Link from "next/link";
import Image from "next/image";
import { Zap } from "lucide-react";
import { cn, slugify } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/formatting";

type ProductCardType =
  | "standard"
  | "discount"
  | "highlighted"
  | "highlighted-discount"
  | "coming-soon";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  discountPrice?: number;
  image_url: string;
}

interface ProductCardProps {
  type: ProductCardType;
  product: Product;
}



export default function ProductCard({ type, product }: ProductCardProps) {
  const { addItem } = useCart();
  const isComingSoon = type === "coming-soon";
  const hasDiscount = type === "discount" || type === "highlighted-discount";
  const isHighlighted =
    type === "highlighted" || type === "highlighted-discount";
  const productSlug = slugify(product.name) || "produto";
  const productHref = `/products/${product.id}/${productSlug}`;

  const handleAddToCart = () => {
    if (isComingSoon) {
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      category: product.category,
      imageUrl: product.image_url,
      unitPrice: product.discountPrice ?? product.price,
      quantity: 1,
    });
  };

  return (
    <div className="w-46 h-100 flex flex-col justify-start relative rounded-xs bg-white p-3">
      {isHighlighted && (
        <div className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-tints-bright-lemon">
          <Zap className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
        </div>
      )}

      <Link href={isComingSoon ? "#" : productHref}>
        <div
          className={`mb-4 h-56 shrink-0 flex items-center justify-center border border-black/10 rounded-xs ${isComingSoon ? "opacity-50" : ""}`}
        >
          <Image
            src={product.image_url || "/placeholder.svg"}
            alt={product.name}
            width={120}
            height={135}
            className="h-full w-6/10 object-contain"
          />
        </div>
      </Link>

      <div className="flex flex-col gap-1">
        <h3
          className={`h-8 overflow-hidden line-clamp-2 font-montserrat text-[14px] font-black leading-tight ${isComingSoon ? "opacity-50" : ""}`}
          style={{ color: "#192227" }}
        >
          <Link href={isComingSoon ? "#" : productHref}>
            {product.name}
          </Link>
        </h3>

        <div className="h-11 flex flex-col justify-end">
          {isComingSoon ? (
            <span
              className="text-[16px] font-bold"
              style={{ color: "#192227", opacity: 0.5 }}
            >
              R$------
            </span>
          ) : hasDiscount ? (
            <>
              <span
                className="text-[12px] font-bold line-through"
                style={{ color: "rgba(168, 20, 37, 0.4)" }}
              >
                {formatCurrency(product.price)}
              </span>
              <span
                className="text-[16px] font-bold"
                style={{ color: "#192227" }}
              >
                {formatCurrency(product.discountPrice ?? product.price)}
              </span>
            </>
          ) : (
            <span
              className="text-[16px] font-bold"
              style={{ color: "#192227" }}
            >
              {formatCurrency(product.price)}
            </span>
          )}
        </div>

        <p
          className={cn(
            "text-[11px] font-medium",
            isComingSoon && "opacity-50"
          )}
          style={{ color: "#4D585E" }}
        >
          por unidade
        </p>

        <button
          onClick={handleAddToCart}
          className={cn(
            "mt-1.5 w-full rounded-xs py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed",
            isComingSoon ? "bg-tints-french-blue/60 cursor-not-allowed" : "bg-tints-french-blue cursor-pointer"
          )}
          disabled={isComingSoon}
        >
          {isComingSoon ? "EM BREVE!" : "Adicionar"}
        </button>
      </div>
    </div>
  );
}
