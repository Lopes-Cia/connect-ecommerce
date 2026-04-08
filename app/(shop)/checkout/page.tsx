"use client";

import Link from "next/link";
import Image from "next/image";

import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/formatting";



export default function CheckoutPage() {
  const { items, totalAmount, totalItems, setItemQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>
        <div className="rounded-lg border border-custom-light-400 bg-white p-8 text-center">
          <p className="text-gray-700 mb-4">Seu carrinho esta vazio.</p>
          <Link
            href="/products"
            className="inline-flex px-4 py-2 rounded bg-tints-french-blue text-white font-medium hover:opacity-90"
          >
            Ir para produtos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-lg border border-custom-light-400 bg-white p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4">Itens do pedido</h2>

          <div className="space-y-4">
            {items.map((item) => {
              const subtotal = item.unitPrice * item.quantity;

              return (
                <div
                  key={item.id}
                  className="flex gap-4 items-center border border-custom-light-300 rounded p-3"
                >
                  <div className="w-16 h-16 rounded bg-custom-light-100 border border-custom-light-300 overflow-hidden flex items-center justify-center">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-custom-dark-1000 line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-sm text-custom-dark-700">{item.category}</p>
                    <p className="text-sm text-custom-dark-700">
                      {formatCurrency(item.unitPrice)} por unidade
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setItemQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded border border-custom-light-400 hover:bg-custom-light-100"
                      aria-label="Diminuir quantidade"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => setItemQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded border border-custom-light-400 hover:bg-custom-light-100"
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right min-w-26">
                    <p className="font-semibold text-custom-dark-1000">
                      {formatCurrency(subtotal)}
                    </p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-tints-french-blue hover:underline"
                    >
                      Remover
                    </button>
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

          <button className="w-full py-3 rounded bg-tints-french-blue text-white font-semibold hover:opacity-90">
            Confirmar pedido
          </button>
        </aside>
      </div>
    </div>
  );
}
