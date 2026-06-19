"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting";
import type {
  ProductCardType,
  ProductCardViewModel,
} from "@/lib/products/viewModels";

interface ProductCardProps {
  type: ProductCardType;
  product: ProductCardViewModel;
}

function normalizeProductHref(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/produtos/")) return raw;

  if (raw.startsWith("/products/")) {
    const parts = raw.split("/").filter(Boolean);
    const last = parts.at(-1) ?? "";
    if (!last || last === "products") return null;
    return `/produtos/${last}`;
  }

  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("produtos/")) return `/${raw}`;

  if (raw.startsWith("products/")) {
    const parts = raw.split("/").filter(Boolean);
    const last = parts.at(-1) ?? "";
    if (!last || last === "products") return null;
    return `/produtos/${last}`;
  }

  return `/produtos/${raw}`;
}



export default function ProductCard({ type, product }: ProductCardProps) {
  const router = useRouter();
  const isComingSoon = type === "coming-soon";
  const hasDiscount = type === "discount" || type === "highlighted-discount";
  const isHighlighted =
    type === "highlighted" || type === "highlighted-discount";
  const maxQuantity =
    typeof product.maxQuantity === "number" && Number.isFinite(product.maxQuantity) ? Math.max(0, Math.floor(product.maxQuantity)) : null;
  const isPurchasable = !isComingSoon && (maxQuantity == null || maxQuantity > 0);
  const productHref = normalizeProductHref(product.slug) ?? "#";
  const imageSrc = product.image_url || "/placeholder.svg";

  const shouldUseImgTag =
    (imageSrc ?? "").startsWith("http://") || (imageSrc ?? "").startsWith("https://");

  const handleBuyClick = () => {
    if (!isPurchasable) {
      return;
    }
    if (productHref.startsWith("http://") || productHref.startsWith("https://")) {
      window.location.href = productHref;
      return;
    }
    router.push(productHref);
  };

  return (
    <div className="w-46 h-100 flex flex-col justify-start relative rounded-xs bg-white p-3">
      {isHighlighted && (
        <div className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-tints-bright-lemon">
          <Zap className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
        </div>
      )}

      <Link href={isPurchasable ? productHref : "#"}>
        <div
          className={`mb-4 h-56 shrink-0 flex items-center justify-center border border-black/10 rounded-xs ${!isPurchasable ? "opacity-50" : ""}`}
        >
          {shouldUseImgTag ? (
            <img
              src={imageSrc}
              alt={product.name}
              width={120}
              height={135}
              className="h-full w-6/10 object-contain"
              onError={(event) => {
                event.currentTarget.src = "/placeholder.svg";
              }}
            />
          ) : (
            <Image
              src={imageSrc}
              alt={product.name}
              width={120}
              height={135}
              className="h-full w-6/10 object-contain"
              unoptimized
              onError={(event) => {
                event.currentTarget.src = "/placeholder.svg";
              }}
            />
          )}
        </div>
      </Link>

      <div className="flex flex-col gap-1">
        <h3
          className={`h-8 overflow-hidden line-clamp-2 font-montserrat text-[14px] font-black leading-tight ${!isPurchasable ? "opacity-50" : ""}`}
          style={{ color: "#192227" }}
        >
          <Link href={isPurchasable ? productHref : "#"}>
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
            !isPurchasable && "opacity-50"
          )}
          style={{ color: "#4D585E" }}
        >
          por embalagem
        </p>

        <button
          onClick={handleBuyClick}
          className={cn(
            "mt-1.5 w-full rounded-xs py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed",
            !isPurchasable ? "bg-tints-french-blue/60 cursor-not-allowed" : "bg-tints-french-blue cursor-pointer"
          )}
          disabled={!isPurchasable}
        >
          {!isPurchasable ? "EM BREVE!" : "Comprar"}
        </button>
      </div>
    </div>
  );
}
