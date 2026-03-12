import { ChevronRight } from "lucide-react";
import Link from "next/link";
import ImageViewer from "./_components/ImageViewer";
import ProductSummary from "./_components/ProductSummary";
import ProductActivity from "./_components/ProductActivity";
import ProductInfo from "./_components/ProductInfo";

// Mock product data - replace with actual API call
const mockProduct = {
  id: "1",
  name: "Cerveja Heineken Lager Premium 350ml Lata",
  shop: "Heineken Brasil",
  price: 4.99,
  oldPrice: 7.99,
  images: [
    "/assets/products/cerveja-heineken.jpg",
    "/assets/products/cerveja-heineken.jpg",
    "/assets/products/cerveja-heineken.jpg",
    "/assets/products/cerveja-heineken.jpg",
    "/assets/products/cerveja-heineken.jpg",
  ],
  specs: [
    { label: "Quantidade:", value: "1 unidade" },
    { label: "Marca:", value: "Heineken" },
    { label: "Tipo:", value: "Cerveja Lager" },
    { label: "Teor Alcoólico:", value: "5%" },
    { label: "Volume:", value: "350ml" },
  ],
  shortDescription:
    "Heineken é uma cerveja lager premium de origem holandesa, conhecida mundialmente pelo seu sabor refrescante, levemente amargo e equilibrado.",
  ingredients:
    "Água, malte de cevada, lúpulo e extrato de lúpulo.",
  legalNotice:
    "Venda proibida para menores de 18 anos. Beba com moderação. As informações nutricionais podem variar de acordo com o lote. Consulte sempre a embalagem do produto.",
  fullDescription:
    "A Heineken é uma das cervejas mais reconhecidas do mundo. Produzida com ingredientes selecionados e o exclusivo fermento Heineken A-Yeast, oferece um sabor fresco, levemente amargo e extremamente equilibrado. Ideal para momentos de confraternização, ela é a escolha certa para quem aprecia uma cerveja de qualidade premium. Sirva bem gelada entre 0°C e 3°C para a melhor experiência.",
  technicalSpecs: [
    { label: "Marca", value: "Heineken" },
    { label: "Fabricante", value: "Heineken Brasil Bebidas S.A." },
    { label: "Volume", value: "350ml" },
    { label: "Embalagem", value: "Lata" },
    { label: "Teor Alcoólico", value: "5% vol." },
    { label: "Código de Barras", value: "7896045500237" },
    { label: "Validade", value: "Conforme impressão na embalagem" },
    { label: "Armazenamento", value: "Conservar em local fresco, seco e ao abrigo da luz" },
  ],
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // TODO: Fetch product data from API using id
  const product = mockProduct;

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 py-6 bg-white">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs font-montserrat text-custom-light-600 mb-6">
        <Link href="/" className="hover:text-custom-dark-1000 transition-colors">
          Início
        </Link>
        <ChevronRight className="size-3" />
        <Link href="/products" className="hover:text-custom-dark-1000 transition-colors">
          Produtos
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-custom-dark-1000">{product.name}</span>
      </nav>

      {/* Main Product Section - 3 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Image Viewer - Left column */}
        <div className="lg:col-span-5 py-4 px-4 bg-custom-light-100 border border-custom-light-400 rounded-md flex items-center justify-center min-w-0">
          <ImageViewer images={product.images} productName={product.name} />
        </div>

        {/* Product Summary - Middle column */}
        <div className="lg:col-span-4 bg-custom-light-100 border border-custom-light-400 rounded-md p-6">
          <ProductSummary
            name={product.name}
            shop={product.shop}
            price={product.price}
            oldPrice={product.oldPrice}
            specs={product.specs}
            description={product.shortDescription}
          />
        </div>

        {/* Product Activity - Right column */}
        <div className="lg:col-span-3">
          <ProductActivity
            price={product.price}
            oldPrice={product.oldPrice}
            productId={product.id}
          />
        </div>
      </div>

      {/* Product Info - Full width bottom section */}
      <div className="max-w-4xl">
        <ProductInfo
          ingredients={product.ingredients}
          legalNotice={product.legalNotice}
          fullDescription={product.fullDescription}
          technicalSpecs={product.technicalSpecs}
        />
      </div>
    </div>
  );
}
