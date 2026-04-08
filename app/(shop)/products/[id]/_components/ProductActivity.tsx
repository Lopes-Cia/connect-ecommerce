"use client";

import { useState } from "react";
import { Truck, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/formatting";

interface ProductActivityProps {
  price: number;
  oldPrice?: number;
  productId?: string;
  productName?: string;
  productImageUrl?: string;
  productCategory?: string;
  pricePerUnit?: string;
  installments?: number;
  installmentValue?: number;
  inStock?: boolean;
  onAddToCart?: (quantity: number) => void;
  onBuyNow?: (quantity: number) => void;
}



export default function ProductActivity({
  price,
  oldPrice,
  productId,
  productName,
  productImageUrl,
  productCategory,
  pricePerUnit,
  installments = 10,
  installmentValue,
  inStock = true,
  onAddToCart,
  onBuyNow,
}: ProductActivityProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [cep, setCep] = useState("");

  const calculatedInstallmentValue = installmentValue || price / installments;

  const handleConsultCep = () => {
    // TODO: Implement CEP consultation
    console.log("Consulting CEP:", cep);
  };

  const addCurrentProductToCart = (selectedQuantity: number) => {
    if (!productId || !productName) {
      return;
    }

    addItem({
      id: productId,
      name: productName,
      category: productCategory,
      imageUrl: productImageUrl,
      unitPrice: price,
      quantity: selectedQuantity,
    });
  };

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(quantity);
      return;
    }

    addCurrentProductToCart(quantity);
  };

  const handleBuyNow = () => {
    if (onBuyNow) {
      onBuyNow(quantity);
      return;
    }

    addCurrentProductToCart(quantity);
    router.push("/checkout");
  };

  return (
    <div className="bg-custom-light-100 border border-custom-light-400 rounded-md p-4 flex flex-col gap-3">
      {/* Price Section */}
      {oldPrice && oldPrice > price && (
        <p className="text-custom-light-600 font-montserrat text-xs line-through">
          {formatCurrency(oldPrice)}
        </p>
      )}
      <div className="flex items-baseline gap-1">
        <span className="text-custom-dark-1000 font-montserrat text-xs">R$</span>
        <span className="text-custom-dark-1000 font-montserrat font-bold text-2xl">
          {price.toFixed(2).replace(".", ",")}
        </span>
        {pricePerUnit && (
          <span className="text-custom-light-600 font-montserrat text-[10px]">
            ({pricePerUnit})
          </span>
        )}
      </div>

      {/* Payment Details */}
      <div className="text-custom-dark-1000 font-montserrat text-xs">
        <p>À vista no PIX</p>
        <p>
          {formatCurrency(price)} em até {installments}x de{" "}
          <span className="font-semibold">
            {formatCurrency(calculatedInstallmentValue)}
          </span>{" "}
          sem juros
        </p>
      </div>

      {/* More Payment Options Link */}
      <Link
        href="#"
        className="text-tints-french-blue font-montserrat text-[10px] underline hover:opacity-80"
      >
        Ver mais opções de pagamento e parcelamento
      </Link>

      {/* Stock Status */}
      <div className="mt-2">
        {inStock ? (
          <span className="text-green-600 font-montserrat font-semibold text-sm">
            Em estoque
          </span>
        ) : (
          <span className="text-red-600 font-montserrat font-semibold text-sm">
            Fora de estoque
          </span>
        )}
      </div>

      {/* Quantity Selector */}
      <div className="flex flex-col gap-1">
        <label className="text-custom-dark-1000 font-montserrat text-xs">
          Quantidade
        </label>
        <select
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full px-3 py-2 border border-custom-light-400 rounded bg-white text-custom-dark-1000 font-montserrat text-sm focus:outline-none focus:ring-1 focus:ring-tints-french-blue"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 mt-2">
        <button
          onClick={handleAddToCart}
          disabled={!inStock}
          className="w-full py-2.5 bg-tints-french-blue cursor-pointer text-white font-montserrat font-semibold text-sm rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Adicionar ao carrinho
        </button>
        <button
          onClick={handleBuyNow}
          disabled={!inStock}
          className="w-full py-2.5 bg-tints-french-blue cursor-pointer text-white font-montserrat font-semibold text-sm rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Comprar agora
        </button>
      </div>

      {/* CEP Section */}
      <div className="mt-4 pt-4 border-t border-custom-light-400">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-tints-french-blue" />
          <span className="text-custom-dark-1000 font-montserrat font-semibold text-xs uppercase">
            Consulte Frete
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            placeholder="Inserir CEP*"
            maxLength={9}
            className="flex-1 px-3 py-2 border border-custom-light-400 rounded bg-white text-custom-dark-1000 font-montserrat text-xs placeholder:text-custom-light-500 focus:outline-none focus:ring-1 focus:ring-tints-french-blue"
          />
          <button
            onClick={handleConsultCep}
            className="px-3 py-2 border border-custom-light-400 rounded bg-white hover:bg-custom-light-200 transition-colors"
          >
            <Search className="w-4 h-4 text-custom-dark-1000" />
          </button>
        </div>
        <Link
          href="#"
          className="text-tints-french-blue font-montserrat text-[10px] underline hover:opacity-80 mt-2 block"
        >
          Não lembra meu CEP
        </Link>
      </div>
    </div>
  );
}
