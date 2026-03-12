"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

const banners = [
  { src: "/assets/banner-1.webp", alt: "Banner 1" },
  { src: "/assets/banner-2.webp", alt: "Banner 2" },
  { src: "/assets/banner-3.webp", alt: "Banner 3" },
  { src: "/assets/banner-4.webp", alt: "Banner 4" },
];

export default function BannerCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const onSelect = useCallback((api: CarouselApi) => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  return (
    <div className="relative w-full">
      <Carousel
        setApi={setApi}
        opts={{ align: "center", loop: true }}
        plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
        className="w-full"
      >
        <CarouselContent className="ml-0">
          {banners.map((banner, index) => (
            <CarouselItem key={index} className="pl-0">
              <div className="relative w-full aspect-4/1">
                <Image
                  src={banner.src}
                  alt={banner.alt}
                  fill
                  className="object-cover rounded-lg"
                  priority={index === 0}
                  sizes="(max-width: 768px) 100vw, 90rem"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Arrow buttons — hidden on mobile, visible on desktop */}
        <CarouselPrevious className="hidden md:flex left-3 bg-white/20 hover:bg-white/40 border-none text-white backdrop-blur-sm transition-colors" />
        <CarouselNext className="hidden md:flex right-3 bg-white/20 hover:bg-white/40 border-none text-white backdrop-blur-sm transition-colors" />
      </Carousel>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {banners.map((_, index) => (
          <button
            key={index}
            aria-label={`Go to slide ${index + 1}`}
            onClick={() => api?.scrollTo(index)}
            className={`rounded-full transition-all duration-300 ${
              index === current
                ? "bg-white w-4 h-2"
                : "bg-white/50 w-2 h-2 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
