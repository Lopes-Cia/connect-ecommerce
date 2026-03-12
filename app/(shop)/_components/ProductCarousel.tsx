import ProductCard from "./ProductCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const mockProducts = [
  {
    id: "1",
    name: "Cerveja Heineken Long Neck 330ml",
    category: "Cervejas",
    price: 9.99,
    discountPrice: 7.49,
    image_url: "/assets/products/cerveja-heineken.jpg",
    type: "highlighted-discount" as const,
  },
  {
    id: "2",
    name: "Coca-Cola Lata 350ml",
    category: "Refrigerantes",
    price: 4.99,
    image_url: "/assets/products/coca-lata.jpg",
    type: "standard" as const,
  },
  {
    id: "3",
    name: "Coca-Cola Zero Lata 350ml",
    category: "Refrigerantes",
    price: 4.99,
    image_url: "/assets/products/coca-zero.jpg",
    type: "standard" as const,
  },
  {
    id: "4",
    name: "Heineken Lata 350ml",
    category: "Cervejas",
    price: 6.49,
    discountPrice: 5.29,
    image_url: "/assets/products/heineken-lata.jpg",
    type: "discount" as const,
  },
  {
    id: "5",
    name: "Smirnoff Vodka 998ml",
    category: "Destilados",
    price: 59.90,
    image_url: "/assets/products/smirnoff.jpg",
    type: "highlighted" as const,
  },
  {
    id: "6",
    name: "Vodka Absolut Original 1L",
    category: "Destilados",
    price: 79.90,
    discountPrice: 69.90,
    image_url: "/assets/products/vodka-absolut.jpg",
    type: "highlighted-discount" as const,
  },
];

export default function ProductCarousel() {
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
        {mockProducts.map((product) => (
          <CarouselItem key={product.id} className="basis-[60%] sm:basis-1/3 md:basis-1/3 lg:basis-1/6">
            <ProductCard
              type={product.type}
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