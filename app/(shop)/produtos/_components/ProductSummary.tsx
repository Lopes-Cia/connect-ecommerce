import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatting";

interface ProductSummaryProps {
  name: string;
  category?: string;
  description: string;
  price: number;
  oldPrice?: number;
  embalagemValue?: number | null;
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
  price,
  oldPrice,
  embalagemValue,
  inStock,
  unitLabel,
  brand,
}: ProductSummaryProps) {
  const safeName = String(name ?? "").trim() || "Produto";
  const safeCategory = String(category ?? "").trim();
  const safeDescription = String(description ?? "").trim() || "Descrição não disponível no momento.";
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

      <p className="text-custom-light-700 font-montserrat text-sm">{safeDescription}</p>

      <div className="mt-2">
        {oldPrice && oldPrice > price ? (
          <p className="text-custom-light-600 font-montserrat text-xs line-through">{formatCurrency(oldPrice)}</p>
        ) : null}
        <div className="flex items-baseline gap-2">
          <span className="text-custom-dark-1000 font-montserrat text-xs">R$</span>
          <span className="text-custom-dark-1000 font-montserrat font-bold text-3xl">
            {price.toFixed(2).replace(".", ",")}
          </span>
          <p className="text-custom-dark-1000 font-montserrat text-xs">por Unidade</p>
        </div>
        {typeof embalagemValue === "number" && Number.isFinite(embalagemValue) && embalagemValue > 0 ? (
          <p className="text-custom-dark-1000 font-montserrat text-xs mt-1">
            valor da embalgem, <span className="font-semibold">{formatCurrency(embalagemValue)}</span>
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
              {brandImageSrc ? (
                <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded border border-custom-light-400 bg-white">
                  {shouldDisableOptimization(brandImageSrc) ? (
                    <img src={brandImageSrc} alt={brandName} width={20} height={20} className="h-full w-full object-contain" />
                  ) : (
                    <Image src={brandImageSrc} alt={brandName} fill className="object-contain" sizes="20px" />
                  )}
                </span>
              ) : null}
              <div className="truncate text-custom-light-700 font-montserrat text-xs">{brandName}</div>
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
