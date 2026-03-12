"use client";

import useCheckIsMobile from "@/hooks/useCheckIsMobile";
import Image from "next/image";
import CategoryLine from "./_components/CategoryLine";
import ProductCarousel from "./_components/ProductCarousel";
import BannerCarousel from "./_components/BannerCarousel";
import Unidades from "./_components/Unidades";
import { Truck, Package, Headphones, CreditCard } from "lucide-react";

export default function Home() {
  const isMobile = useCheckIsMobile();

  return (
    <div>
      {isMobile ? (
        <div className="w-full flex justify-center">
          <Image
            src="/assets/banner-mobile.webp"
            alt="Banner Mobile"
            width={375}
            height={200}
            className="max-w-100 h-auto"
          />
        </div>
      ) : (
        <BannerCarousel />
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
      <section className="w-full grid grid-cols-3 md:grid-cols-6 gap-2 px-4 md:px-20 my-10">
        <a href="#" className="hover:opacity-80 transition-opacity">
          <Image
            src="/assets/categoria-piracanjuba.webp"
            alt="Categoria Piracanjuba"
            width={158}
            height={197}
            className="w-full h-auto"
          />
        </a>
        <a href="#" className="hover:opacity-80 transition-opacity">
          <Image
            src="/assets/categoria-redbull.webp"
            alt="Categoria Redbull"
            width={158}
            height={197}
            className="w-full h-auto"
          />
        </a>
        <a href="#" className="hover:opacity-80 transition-opacity">
          <Image
            src="/assets/categoria-monster.png"
            alt="Categoria Monster"
            width={158}
            height={197}
            className="w-full h-auto"
          />
        </a>
        <a href="#" className="hover:opacity-80 transition-opacity">
          <Image
            src="/assets/categoria-heinz.webp"
            alt="Categoria Heinz"
            width={158}
            height={197}
            className="w-full h-auto"
          />
        </a>
        <a href="#" className="hover:opacity-80 transition-opacity">
          <Image
            src="/assets/categoria-ype.webp"
            alt="Categoria Ypê"
            width={158}
            height={197}
            className="w-full h-auto"
          />
        </a>
        <a href="#" className="hover:opacity-80 transition-opacity">
          <Image
            src="/assets/categoria-ambev.webp"
            alt="Categoria Ambev"
            width={158}
            height={197}
            className="w-full h-auto"
          />
        </a>
      </section>
      <section aria-label="Mais Vendidos">
        <CategoryLine
          title="MAIS VENDIDOS"
          bgColor="bg-black/90"
          verticalLineColor="bg-white"
        />
        <div className="w-full flex justify-center py-10 px-4">
          <ProductCarousel />
        </div>
      </section>
      <section aria-label="Promoções">
        <CategoryLine
          title="PROMOÇÕES"
          bgColor="bg-tints-french-blue"
          verticalLineColor="bg-white"
        />
        <div className="w-full flex justify-center py-10 px-4">
          <ProductCarousel />
        </div>
      </section>
      <section aria-label="Cervejas">
        <CategoryLine
          title="CERVEJAS"
          bgColor="bg-tints-french-blue"
          verticalLineColor="bg-white"
        />
        <div className="w-full flex justify-center py-10 px-4">
          <ProductCarousel />
        </div>
      </section>
      <Unidades />
    </div>
  );
}
