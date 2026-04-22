import ProductCardVariant from "./ProductCardVariant";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { ProductCardViewModel } from "@/lib/products/viewModels";

interface ProductCarouselProps {
  products: ProductCardViewModel[];
  itemsPerViewMobile?: number;
  itemsPerViewDesktop?: number;
}

export default function ProductCarousel({
  products,
  itemsPerViewMobile = 2,
  itemsPerViewDesktop = 5,
}: ProductCarouselProps) {
  if (products.length === 0) {
    return (
      <div className="w-full py-10 text-center text-custom-dark-700 font-montserrat text-sm">
        Nenhum produto disponivel no momento.
      </div>
    );
  }

  const safeMobile = Number.isFinite(itemsPerViewMobile) ? Math.max(1, Math.trunc(itemsPerViewMobile)) : 2;
  const safeDesktop = Number.isFinite(itemsPerViewDesktop) ? Math.max(1, Math.trunc(itemsPerViewDesktop)) : 4;

  return (
    <Carousel
      className="w-full"
      opts={{
        align: "start",
        loop: false,
        watchDrag: (_, evt) => !(evt instanceof MouseEvent),
      }}
    >
      <CarouselContent
        className="-ml-6 md:-ml-6 [--pc-items:var(--pc-items-mobile)] lg:[--pc-items:var(--pc-items-desktop)]"
        style={
          {
            ["--pc-items-mobile" as any]: safeMobile,
            ["--pc-items-desktop" as any]: safeDesktop,
          } as any
        }
      >
        {products.map((product) => (
          <CarouselItem key={product.id} className="basis-[calc(100%/var(--pc-items))]">
            <ProductCardVariant
              type={product.cardType ?? "standard"}
              product={{
                id: product.id,
                name: product.name,
                category: product.category,
                price: product.price,
                discountPrice: product.discountPrice,
                image_url: product.image_url,
                slug: product.slug,
              }}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex ml-4 lg:ml-2 2xl:ml-0" />
      <CarouselNext className="hidden md:flex mr-4 lg:mr-2 2xl:mr-0" />
    </Carousel>
  );
}
