"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import ProductCard from "../_components/ProductCard";
import { getProducts } from "@/lib/api/products";
import { toProductCardViewModel } from "@/lib/products/viewModels";

type ProductCardType =
  | "standard"
  | "discount"
  | "highlighted"
  | "highlighted-discount"
  | "coming-soon";

interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  discountPrice?: number;
  image_url: string;
  cardType?: ProductCardType;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      try {
        const result = await getProducts();
        if (!active) {
          return;
        }

        setProducts(result.map(toProductCardViewModel));
        setLoadError(null);
      } catch (error) {
        if (!active) {
          return;
        }

        setLoadError("Nao foi possivel carregar os produtos agora.");
        console.error("Failed to load products page data", error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    return [...new Set(products.map((product) => product.category))].sort(
      (left, right) => left.localeCompare(right)
    );
  }, [products]);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory
      ? product.category === selectedCategory
      : true;
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleClearFilter = () => {
    setSelectedCategory("");
    setSearchTerm("");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-custom-light-100 to-custom-light-300">
      {/* Header */}
      <div className="px-4 md:px-6 pt-6 md:pt-8 pb-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-league-spartan font-bold text-custom-dark-1000 mb-2">
            Catálogo de Bebidas
          </h1>
          <p className="text-custom-dark-700 font-montserrat text-sm md:text-base">
            Explore o portfolio completo para reposicao rapida do seu estoque.
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="px-4 md:px-6 pb-3">
        <div className="max-w-7xl mx-auto rounded-xl border border-custom-light-300 bg-white p-4 md:p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 md:gap-4">
            <div className="w-full lg:max-w-sm">
              <label className="block mb-1 text-xs font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-md border border-custom-light-400 bg-white text-custom-dark-1000 font-montserrat text-sm focus:outline-none focus:border-tints-french-blue focus:ring-2 focus:ring-tints-french-blue focus:ring-opacity-20"
              >
                <option value="">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full lg:flex-1">
              <label className="block mb-1 text-xs font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700">
                Buscar produto
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-custom-light-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex.: Heineken, Vodka, Coca-Cola"
                  className="w-full pl-11 pr-3 py-2.5 rounded-md border border-custom-light-400 bg-white text-custom-dark-1000 font-montserrat text-sm placeholder:text-custom-light-600 focus:outline-none focus:border-tints-french-blue focus:ring-2 focus:ring-tints-french-blue focus:ring-opacity-20"
                />
              </div>
            </div>

            {(selectedCategory || searchTerm) && (
              <button
                onClick={handleClearFilter}
                className="h-10.5 px-4 bg-tints-french-blue text-white font-montserrat font-semibold text-sm rounded-md hover:opacity-90 transition-opacity"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          <p className="mt-3 text-xs md:text-sm font-montserrat text-custom-dark-700">
            Exibindo {filteredProducts.length} de {products.length} produtos
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-4 md:px-6 py-4 md:py-6">
        <div className="max-w-7xl mx-auto">
          {isLoading && (
            <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-white/70 mt-4">
              <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">
                Carregando produtos...
              </p>
            </div>
          )}

          {loadError && !isLoading && (
            <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-white/70 mt-4">
              <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">
                {loadError}
              </p>
            </div>
          )}

          {!isLoading && !loadError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                type={product.cardType ?? (product.discountPrice ? "discount" : "standard")}
                product={product}
              />
            ))}
          </div>
          )}

        {!isLoading && !loadError && filteredProducts.length === 0 && (
          <div className="text-center py-14 rounded-xl border border-dashed border-custom-light-400 bg-white/70 mt-4">
            <p className="text-custom-dark-1000 font-montserrat text-base md:text-lg">
              Nenhum produto encontrado com os filtros atuais.
            </p>
            <p className="text-custom-dark-700 font-montserrat text-sm mt-1">
              Tente outra categoria ou ajuste o termo de busca.
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

