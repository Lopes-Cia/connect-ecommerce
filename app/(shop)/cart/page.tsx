"use client";

import Link from "next/link";

import { formatCurrency } from "@/lib/formatting";
import { slugify } from "@/lib/utils";
import { frontModal } from "@/stores/front-modal-store";
import { useControlStore } from "@/stores/control-store";

const PRODUCT_IMAGE_FALLBACK = "/logo.png";

export default function CartPage() {
  const useCarrinhoStore = useControlStore((s) => s.CARRINHOSTORE);
  const items = useCarrinhoStore((s) => s.items);
  const totalAmount = useCarrinhoStore((s) => s.totalAmount);
  const totalItems = useCarrinhoStore((s) => s.totalItems);
  const setItemQuantity = useCarrinhoStore((s) => s.setItemQuantity);
  const removeItem = useCarrinhoStore((s) => s.removeItem);

  const safeSetItemQuantity = async (id: string, quantity: number) => {
    try {
      await setItemQuantity(id, quantity);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao atualizar quantidade.";
      void frontModal.error({
        title: "Erro no carrinho",
        description: message,
      });
    }
  };

  const safeRemoveItem = async (id: string) => {
    try {
      await removeItem(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao remover item.";
      void frontModal.error({
        title: "Erro no carrinho",
        description: message,
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className="w-full py-8">
        <h1 className="text-3xl font-bold mb-6">Carrinho de compras</h1>
        <div className="rounded-lg border border-custom-light-400 bg-white p-8 text-center">
          <p className="text-gray-700 mb-4">Seu carrinho esta vazio.</p>
          <Link
            href="/categorias"
            className="inline-flex px-4 py-2 rounded bg-tints-french-blue text-white font-medium hover:opacity-90"
          >
            Ir para categorias
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      <h1 className="text-3xl font-bold mb-6">Carrinho de compras</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-lg border border-custom-light-400 bg-white p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4">Itens do carrinho</h2>

          <div className="divide-y divide-custom-light-300">
            {items.map((item) => {
              const subtotal = item.unitPrice * item.quantity;
              const idSegment = String(item.id ?? "").trim();
              const baseSlug = slugify(item.name) || encodeURIComponent(idSegment);
              const slugSegment = idSegment ? `${baseSlug}-${encodeURIComponent(idSegment)}` : baseSlug;
              const productHref = `/produtos/${slugSegment}`;

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <Link href={productHref} className="w-16 h-16 shrink-0">
                      <div className="w-16 h-16 rounded bg-custom-light-100 border border-custom-light-300 overflow-hidden flex items-center justify-center">
                        <img
                          src={item.imageUrl || PRODUCT_IMAGE_FALLBACK}
                          alt={item.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(event) => {
                            const img = event.currentTarget;
                            if (img.src.endsWith(PRODUCT_IMAGE_FALLBACK)) return;
                            img.src = PRODUCT_IMAGE_FALLBACK;
                          }}
                        />
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={productHref}
                        className="block font-semibold text-custom-dark-1000 line-clamp-2 hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="text-sm text-custom-dark-700">{item.category}</p>
                      <p className="text-sm text-custom-dark-700">
                        {formatCurrency(item.unitPrice)} por unidade
                      </p>
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => void safeSetItemQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded border border-custom-light-400 hover:bg-custom-light-100"
                        aria-label="Diminuir quantidade"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => void safeSetItemQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded border border-custom-light-400 hover:bg-custom-light-100"
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right min-w-[6.5rem]">
                      <p className="font-semibold text-custom-dark-1000">
                        {formatCurrency(subtotal)}
                      </p>
                      <button
                        onClick={() => void safeRemoveItem(item.id)}
                        className="text-xs text-tints-french-blue hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="rounded-lg border border-custom-light-400 bg-white p-4 md:p-6 h-fit">
          <h2 className="text-lg font-semibold mb-4">Resumo</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Itens</span>
              <span>{totalItems}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Frete</span>
              <span>A calcular</span>
            </div>
          </div>

          <div className="border-t border-custom-light-300 my-4" />

          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold text-tints-french-blue">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <Link
            href="/checkout"
            className="block w-full py-3 rounded bg-tints-french-blue text-white font-semibold hover:opacity-90 text-center"
          >
            Finalizar compra
          </Link>
        </aside>
      </div>
    </div>
  );
}
