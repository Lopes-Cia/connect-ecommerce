"use client";

import { useEffect, useMemo } from "react";
import useCheckIsMobile from "@/hooks/useCheckIsMobile";
import Image from "next/image";
import CategoryLine from "./_components/CategoryLine";
import ProductCarousel from "./_components/ProductCarousel";
import BannerCarousel from "./_components/BannerCarousel";
import Unidades from "./_components/Unidades";
import HomeCategoryCard from "./_components/HomeCategoryCard";
import { Truck, Package, Headphones, CreditCard } from "lucide-react";
import { useControlStore } from "@/stores/control-store";
import {
  toHomeBannerSlides,
  toHomeCategoryCards,
  toHomeMaisVendidosProducts,
  toHomePromocaoProducts,
} from "@/lib/ecommerce/homeViewModels";

function isLocalhostUrl(value: string): boolean {
  const src = String(value ?? "").trim();
  if (!src) return false;
  if (!/^https?:\/\//i.test(src)) return false;
  try {
    const parsed = new URL(src);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  } catch {
    return false;
  }
}

export default function Home() {
  const isMobile = useCheckIsMobile();
  const useEcommerceStore = useControlStore((s) => s.ECOMMERCESTORE);
  const home = useEcommerceStore((s) => s.home);
  const homeStatus = useEcommerceStore((s) => s.homeStatus);
  const homeError = useEcommerceStore((s) => s.homeError);
  const loadHome = useEcommerceStore((s) => s.loadHome);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const homePayload = home?.home;
  const bannerItems = useMemo(
    () => toHomeBannerSlides(homePayload),
    [homePayload]
  );
  const categoryCards = useMemo(
    () => toHomeCategoryCards(homePayload),
    [homePayload]
  );
  const maisVendidosProducts = useMemo(
    () => toHomeMaisVendidosProducts(homePayload),
    [homePayload]
  );
  const promocaoProducts = useMemo(
    () => toHomePromocaoProducts(homePayload),
    [homePayload]
  );
  const mobileBannerSrc = bannerItems[0]?.src || "/assets/banner-mobile.webp";

  return (
    <div>
      {isMobile ? (
        <div className="w-full flex justify-center">
          {isLocalhostUrl(mobileBannerSrc) ? (
            <img
              src={mobileBannerSrc}
              alt="Banner Mobile"
              width={375}
              height={200}
              className="max-w-100 h-auto"
              loading="eager"
              decoding="async"
            />
          ) : (
            <Image
              src={mobileBannerSrc}
              alt="Banner Mobile"
              width={375}
              height={200}
              className="max-w-100 h-auto"
            />
          )}
        </div>
      ) : (
        <BannerCarousel items={bannerItems} />
      )}
      {homeStatus === "loading" && (
        <div className="px-4 md:px-20 mt-4 text-sm text-custom-dark-700 font-montserrat">
          Carregando home...
        </div>
      )}
      {homeStatus === "error" && (
        <div className="px-4 md:px-20 mt-4 text-sm text-red-700 font-montserrat">
          Erro ao carregar home: {homeError ?? "erro inesperado"}
        </div>
      )}
      <div className="py-4 px-4 my-8 border-y border-black/30 xs:hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-4 md:gap-3">
          <div className="flex items-center gap-2">
            <Truck className="w-8 h-8 text-tints-french-blue" />
            <div>
              <p className="text-tints-french-blue font-montserrat font-bold text-base">
                Ofertas e Promoções
              </p>
              <p className="text-custom-dark-1000 font-montserrat text-[0.75em]">
                Preço baixo é aqui!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Package className="w-8 h-8 text-tints-french-blue" />
            <div>
              <p className="text-tints-french-blue font-montserrat font-bold text-base">
                Cliente Satisfeito
              </p>
              <p className="text-custom-dark-1000 font-montserrat text-[0.7em]">
                Entrega garantida
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Headphones className="w-8 h-8 text-tints-french-blue" />
            <div>
              <p className="text-tints-french-blue font-montserrat font-bold text-base">
                Suporte ao Cliente
              </p>
              <p className="text-custom-dark-1000 font-montserrat text-[0.7em]">
                Atendimento Seg a Sex: 8 às 18
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-tints-french-blue" />
            <div>
              <p className="text-tints-french-blue font-montserrat font-bold text-base">
                Pagamento Seguro
              </p>
              <p className="text-custom-dark-1000 font-montserrat text-[0.7em]">
                Aceitamos cartão, pix e boleto
              </p>
            </div>
          </div>
        </div>
      </div>
      <section className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6 px-4 md:px-20 my-12">
        {categoryCards.length === 0 && homeStatus !== "loading" && (
          <div className="col-span-full text-sm text-custom-dark-700 font-montserrat">
            Nenhuma categoria em destaque no momento.
          </div>
        )}
        {categoryCards.map((category) => (
          <HomeCategoryCard
            key={category.id}
            id={category.id}
            name={category.name}
            image={category.image}
            href={category.slug}
          />
        ))}
      </section>
      <section aria-label="Mais Vendidos">
        <CategoryLine
          title="MAIS VENDIDOS"
          bgColor="bg-black/90"
          verticalLineColor="bg-white"
        />
        <div className="w-full flex justify-center py-10 px-4">
          <ProductCarousel products={maisVendidosProducts} />
        </div>
      </section>
      <section aria-label="Promoções">
        <CategoryLine
          title="PROMOÇÕES"
          bgColor="bg-tints-french-blue"
          verticalLineColor="bg-white"
        />
        <div className="w-full flex justify-center py-10 px-4">
          <ProductCarousel products={promocaoProducts} />
        </div>
      </section>
      <Unidades />
    </div>
  );
}
