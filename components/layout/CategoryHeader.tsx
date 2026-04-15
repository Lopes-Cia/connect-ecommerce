"use client";

import Link from "next/link";
import useCheckIsMobile from "@/hooks/useCheckIsMobile";
import { useControlStore } from "@/stores/control-store";

export default function CategoryHeader() {
  const isMobile = useCheckIsMobile();
  const live = useControlStore((state) => state.live);

  if (isMobile) {
    return (
      <div className="flex justify-center items-center h-8 bg-tints-carbon-black">
        <Link
          href="/products"
          className="text-white font-montserrat font-medium text-[0.7em] uppercase text-sm hover:underline"
        >
          Ver Todas as categorias
        </Link>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-12 bg-black/90">
      <nav className="max-w-[var(--width-content-md)] lg:max-w-[var(--width-content-lg)] mx-auto flex gap-8 justify-center items-center text-white font-montserrat font-medium text-[0.78em] uppercase">
        <div className="flex items-center gap-3">
          <a href="#" className="hover:underline">
            Todas as categorias
          </a>
          <button
            type="button"
            onClick={() => console.log(live())}
            className="hover:underline"
          >
            TEST API
          </button>
        </div>
        <a href="#" className="hover:underline">
          Promoções
        </a>
        <a href="#" className="hover:underline">
          Bebidas
        </a>
        <a href="#" className="hover:underline">
          Laticínios
        </a>
        <a href="#" className="hover:underline">
          Mercearia
        </a>
        <a href="#" className="hover:underline">
          Limpeza
        </a>
      </nav>
    </div>
  );
}
