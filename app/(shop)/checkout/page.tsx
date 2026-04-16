"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useCart } from "@/contexts/CartContext";
import { useClientesStore } from "@/stores/clientes-store";
import CheckoutForm from "./_components/CheckoutForm";

export default function CheckoutPage() {
  const router = useRouter();
  const { items } = useCart();
  const isLoggedIn = useClientesStore((s) => s.isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) return;
    router.replace("/login");
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>
        <div className="rounded-lg border border-custom-light-400 bg-white p-8 text-center">
          <p className="text-gray-700 mb-4">Seu carrinho esta vazio.</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/cart"
              className="inline-flex px-4 py-2 rounded border border-custom-light-400 bg-white text-custom-dark-1000 font-medium hover:bg-custom-light-100"
            >
              Ver carrinho
            </Link>
            <Link
              href="/categorias"
              className="inline-flex px-4 py-2 rounded bg-tints-french-blue text-white font-medium hover:opacity-90"
            >
              Ir para categorias
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      <div className="rounded-lg border border-custom-light-400 bg-white p-4 md:p-6">
        <CheckoutForm />
      </div>
    </div>
  );
}
