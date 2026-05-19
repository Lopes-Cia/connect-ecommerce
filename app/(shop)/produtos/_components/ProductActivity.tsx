"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatting";
import { frontModal } from "@/stores/front-modal-store";
import { useControlStore } from "@/stores/control-store";

interface ProductActivityProps {
  price: number;
  oldPrice?: number;
  productId?: string;
  productName?: string;
  productImageUrl?: string;
  productCategory?: string;
  sku?: string;
  embalagemValue?: number | null;
  embalagemUnits?: number | null;
  showHeaderPrice?: boolean;
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
  sku,
  embalagemValue,
  embalagemUnits,
  showHeaderPrice = true,
  pricePerUnit,
  installments = 10,
  installmentValue,
  inStock = true,
  onAddToCart,
  onBuyNow,
}: ProductActivityProps) {
  const router = useRouter();
  const useCarrinhoStore = useControlStore((s) => s.CARRINHOSTORE);
  const items = useCarrinhoStore((s) => s.items);
  const addItem = useCarrinhoStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);

  const calculatedInstallmentValue = installmentValue || price / installments;
  const maxQuantity = 10;
  const safeSku = String(sku ?? "").trim();
  const safeEmbalagemValue =
    typeof embalagemValue === "number" && Number.isFinite(embalagemValue) && embalagemValue > 0 ? embalagemValue : null;
  const safeEmbalagemUnits =
    typeof embalagemUnits === "number" && Number.isFinite(embalagemUnits) && embalagemUnits > 1 ? Math.floor(embalagemUnits) : 1;
  const totalValue = safeEmbalagemValue != null ? safeEmbalagemValue * quantity : null;

  const addCurrentProductToCart = async (selectedQuantity: number) => {
    if (!productId || !productName) {
      return;
    }

    const existed = items.some((x) => x.id === productId);
    try {
      await addItem({
        id: productId,
        name: productName,
        category: productCategory,
        imageUrl: productImageUrl,
        unitPrice: price,
        embalagemUnits: safeEmbalagemUnits,
        quantity: selectedQuantity,
      });
      void frontModal.success({
        title: existed ? "Quantidade atualizada" : "Adicionado ao carrinho",
        description: existed
          ? `${productName} teve a quantidade atualizada no seu carrinho.`
          : `${productName} foi adicionado no seu carrinho.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao adicionar no carrinho.";
      void frontModal.error({
        title: "Erro no carrinho",
        description: message,
      });
    }
  };

  const handleAddToCart = async () => {
    if (onAddToCart) {
      onAddToCart(quantity);
      return;
    }

    await addCurrentProductToCart(quantity);
  };

  const handleBuyNow = async () => {
    if (onBuyNow) {
      onBuyNow(quantity);
      return;
    }

    await addCurrentProductToCart(quantity);
    router.push("/checkout");
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        {showHeaderPrice ? (
          <div>
            {oldPrice && oldPrice > price && (
              <p className="text-custom-light-600 font-montserrat text-xs line-through">{formatCurrency(oldPrice)}</p>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-custom-dark-1000 font-montserrat text-xs">R$</span>
              <span className="text-custom-dark-1000 font-montserrat font-bold text-3xl">
                {price.toFixed(2).replace(".", ",")}
              </span>
              {pricePerUnit ? (
                <span className="text-custom-light-600 font-montserrat text-[10px]">({pricePerUnit})</span>
              ) : null}
            </div>
          </div>
        ) : null}

      <div className="grid grid-cols-12 gap-3 items-stretch">
        <div className="col-span-5 flex flex-col gap-2">
          <div className="grid grid-cols-3 border border-custom-light-400 bg-white">
            <button
              type="button"
              aria-label="Diminuir quantidade"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={!inStock || quantity <= 1}
              className="h-11 flex items-center justify-center text-custom-dark-1000 disabled:opacity-40"
            >
              -
            </button>
            <div className="h-11 flex items-center justify-center text-custom-dark-1000 font-montserrat text-sm border-x border-custom-light-400">
              {quantity}
            </div>
            <button
              type="button"
              aria-label="Aumentar quantidade"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={!inStock || quantity >= maxQuantity}
              className="h-11 flex items-center justify-center text-custom-dark-1000 disabled:opacity-40"
            >
              +
            </button>
          </div>
          <div className="h-11 border border-custom-light-400 bg-white px-3 flex items-center justify-between text-custom-dark-1000 font-montserrat text-xs">
            <span className="text-custom-light-700">Total:</span>
            <span className="font-semibold text-custom-dark-1000">
              {totalValue != null ? formatCurrency(totalValue) : "-"}
            </span>
          </div>
        </div>

        <div className="col-span-7 flex flex-col gap-2">
        <button
          onClick={() => void handleAddToCart()}
          disabled={!inStock}
          className="w-full h-11 bg-tints-french-blue cursor-pointer text-white font-montserrat font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Adicionar ao carrinho
        </button>
        <button
          onClick={() => void handleBuyNow()}
          disabled={!inStock}
          className="w-full h-11 border border-custom-light-400 bg-white cursor-pointer text-custom-dark-1000 font-montserrat font-semibold text-sm hover:bg-custom-light-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Comprar agora
        </button>
      </div>
      </div>

      </div>
    </>
  );
}
