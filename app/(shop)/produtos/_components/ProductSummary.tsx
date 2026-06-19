import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatting";

interface ProductSummaryProps {
  name: string;
  category?: string;
  description?: string;
  secondaryDescription?: string;
  price: number;
  oldPrice?: number;
  paleteValue?: number | null;
  inStock?: boolean;
  unitLabel?: string;
  brand?: {
    name: string;
    slug: string;
    image?: string | null;
  } | null;
}

function shouldDisableOptimization(src: string): boolean {
  const value = String(src ?? "").trim();
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  } catch {
    return value.includes("localhost") || value.includes("127.0.0.1");
  }
}

export default function ProductSummary({
  name,
  category,
  description,
  secondaryDescription,
  price,
  oldPrice,
  paleteValue,
  inStock,
  unitLabel,
  brand,
}: ProductSummaryProps) {
  const safeName = String(name ?? "").trim() || "Produto";
  const safeCategory = String(category ?? "").trim();
  const safeDescription = String(description ?? "").trim();
  const safeSecondaryDescription = String(secondaryDescription ?? "").trim();
  const safeUnitLabel = String(unitLabel ?? "").trim();
  const brandName = String(brand?.name ?? "").trim();
  const brandHref = String(brand?.slug ?? "").trim();
  const brandImageSrc = String(brand?.image ?? "").trim();

  return (
    <div className="flex flex-col gap-4">
      {safeCategory ? (
        <div className="text-custom-light-600 font-montserrat text-xs tracking-widest uppercase">{safeCategory}</div>
      ) : null}

      <h1 className="text-custom-dark-1000 font-league-spartan font-bold text-3xl leading-tight">{safeName}</h1>

      {safeDescription ? <p className="text-custom-light-700 font-montserrat text-sm">{safeDescription}</p> : null}
      {safeSecondaryDescription ? (
        <p className="text-custom-light-700 font-montserrat text-sm">{safeSecondaryDescription}</p>
      ) : null}

      <div className="mt-2">
        {oldPrice && oldPrice > price ? (
          <p className="text-custom-light-600 font-montserrat text-xs line-through">{formatCurrency(oldPrice)}</p>
        ) : null}
        <div className="flex items-baseline gap-2">
          <span className="text-custom-dark-1000 font-montserrat text-xs">R$</span>
          <span className="text-custom-dark-1000 font-montserrat font-bold text-3xl">
            {price.toFixed(2).replace(".", ",")}
          </span>
          <p className="text-custom-dark-1000 font-montserrat text-xs">por Embalagem</p>
        </div>
        {typeof paleteValue === "number" && Number.isFinite(paleteValue) && paleteValue > 0 ? (
          <p className="text-custom-dark-1000 font-montserrat text-xs mt-1">
            valor do Palete, <span className="font-semibold">{formatCurrency(paleteValue)}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-2">
        {brandName ? (
          <Link
            href={brandHref || "#"}
            aria-disabled={!brandHref}
            tabIndex={brandHref ? undefined : -1}
            className={[
              "flex items-center justify-between gap-4 py-3 border-b border-custom-light-300",
              brandHref ? "hover:opacity-80 transition-opacity" : "pointer-events-none opacity-80",
            ].join(" ")}
          >
            <div className="text-custom-dark-1000 font-montserrat text-xs font-semibold">Marca</div>
            <div className="min-w-0 flex items-center gap-2">
              <div className="truncate text-custom-light-700 font-montserrat text-xs">{brandName}</div>
              {brandImageSrc ? (
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-custom-light-400 bg-white">
                  {shouldDisableOptimization(brandImageSrc) ? (
                    <img src={brandImageSrc} alt={brandName} width={56} height={56} className="h-full w-full object-contain" />
                  ) : (
                    <Image src={brandImageSrc} alt={brandName} fill className="object-contain" sizes="56px" />
                  )}
                </span>
              ) : null}
            </div>
          </Link>
        ) : null}

        {safeUnitLabel ? (
          <div className="flex items-center justify-between gap-4 py-3 border-b border-custom-light-300">
            <div className="text-custom-dark-1000 font-montserrat text-xs font-semibold">Unidade</div>
            <div className="flex items-center gap-2">
              <div className="text-custom-light-700 font-montserrat text-xs">{safeUnitLabel}</div>
            </div>
          </div>
        ) : null}

        {typeof inStock === "boolean" ? (
          <div className="flex items-center justify-between gap-4 py-3 border-b border-custom-light-300">
            <div className="text-custom-dark-1000 font-montserrat text-xs font-semibold">Disponibilidade</div>
            {inStock ? (
              <div className="text-green-700 font-montserrat text-xs font-semibold">Em estoque</div>
            ) : (
              <div className="text-red-700 font-montserrat text-xs font-semibold">Indisponível</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
