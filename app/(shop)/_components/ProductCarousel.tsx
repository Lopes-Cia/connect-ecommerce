import ProductCard from "./ProductCard";
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
}

export default function ProductCarousel({ products }: ProductCarouselProps) {
  if (products.length === 0) {
    return (
      <div className="w-full py-10 text-center text-custom-dark-700 font-montserrat text-sm">
        Nenhum produto disponivel no momento.
      </div>
    );
  }

  return (
    <Carousel
      className="w-full"
      opts={{
        align: "start",
        loop: false,
        watchDrag: (_, evt) => !(evt instanceof MouseEvent),
      }}
    >
      <CarouselContent className="-ml-6 md:-ml-6">
        {products.map((product) => (
          <CarouselItem key={product.id} className="basis-[60%] sm:basis-1/3 md:basis-1/3 lg:basis-1/6">
            <ProductCard
              type={product.cardType ?? "standard"}
              product={{
                id: product.id,
                name: product.name,
                category: product.category,
                price: product.price,
                discountPrice: product.discountPrice,
                image_url: product.image_url,
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