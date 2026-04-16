"use client";

import Link from "next/link";
import Image from "next/image";

function shouldDisableOptimization(src: string): boolean {
  const value = String(src ?? "").trim();
  if (!value) return false;

  try {
    const parsed = new URL(value, "http://localhost");
    const hostWithPort = `${parsed.hostname}:${parsed.port || (parsed.protocol === "https:" ? "443" : "80")}`;
    return hostWithPort === "localhost:4000" || hostWithPort === "127.0.0.1:4000";
  } catch {
    return value.includes("localhost:4000") || value.includes("127.0.0.1:4000");
  }
}

type BrandBlockProps = {
  brand: {
    name: string;
    slug: string;
    image?: string | null;
  };
};

export default function BrandBlock({ brand }: BrandBlockProps) {
  const imageSrc = String(brand.image ?? "").trim();
  const href = String(brand.slug ?? "").trim() || "#";

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md border border-custom-light-400 bg-custom-light-100 px-4 py-3 hover:bg-custom-light-200 transition-colors"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-custom-light-400 bg-white">
        {imageSrc ? (
          shouldDisableOptimization(imageSrc) ? (
            <img src={imageSrc} alt={brand.name} width={40} height={40} className="h-full w-full object-contain" />
          ) : (
            <Image src={imageSrc} alt={brand.name} fill className="object-contain" sizes="40px" />
          )
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="text-xs font-montserrat text-custom-light-600">Marca</div>
        <div className="truncate font-montserrat font-semibold text-custom-dark-1000">{brand.name}</div>
      </div>
    </Link>
  );
}

