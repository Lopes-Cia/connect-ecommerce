"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useClientesStore } from "@/stores/clientes-store";
import { frontModal } from "@/stores/front-modal-store";
import { Button } from "@/components/ui/button";
import CheckoutForm from "./_components/CheckoutForm";
import { useControlStore } from "@/stores/control-store";
import { useAuth } from "@/contexts/AuthContext";
import { isBackendMode } from "@/lib/runtime/appMode";

export default function CheckoutPage() {
  const router = useRouter();
  const backendMode = isBackendMode();
  const useCarrinhoStore = useControlStore((s) => s.CARRINHOSTORE);
  const items = useCarrinhoStore((s) => s.items);
  const clientesIsLoggedIn = useClientesStore((s) => s.isLoggedIn);
  const { isAuthenticated, isLoading } = useAuth();
  const isLoggedIn = backendMode ? isAuthenticated : clientesIsLoggedIn;
  const openedLoginModalRef = useRef(false);

  useEffect(() => {
    if (backendMode && isLoading) return;
    if (isLoggedIn) return;
    if (openedLoginModalRef.current) return;
    openedLoginModalRef.current = true;

    void (async () => {
      const confirmed = await frontModal.confirm({
        title: "Login necessário",
        description: "Faça login para continuar.",
        confirmText: "Ir para login",
        cancelText: "Cancelar",
      });

      if (!confirmed) return;
      if (!backendMode && useClientesStore.getState().isLoggedIn) return;
      router.replace("/login");
      router.refresh();
    })();
  }, [backendMode, isLoading, isLoggedIn, router]);

  if (backendMode && isLoading) {
    return null;
  }

  if (!isLoggedIn) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f7f7f8_0%,#ffffff_28%,#ffffff_100%)] p-3 sm:p-5 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-montserrat font-semibold uppercase tracking-widest text-custom-light-600">
                  Checkout
                </p>
                <h1 className="mt-1 text-2xl font-league-spartan font-bold text-custom-dark-1000 sm:text-3xl">
                  Finalizar compra
                </h1>
                <p className="mt-2 text-sm font-montserrat text-custom-dark-700">
                  Revise seus dados e confirme o pedido.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/cart">Voltar ao carrinho</Link>
              </Button>
            </div>
          </header>

          <div className="rounded-2xl border border-custom-light-300 bg-white p-6 text-center shadow-sm sm:p-8">
            <p className="text-sm font-montserrat text-custom-dark-700">
              Seu carrinho está vazio.
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="outline">
                <Link href="/cart">Ver carrinho</Link>
              </Button>
              <Button asChild>
                <Link href="/categorias">Ir para categorias</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f7f8_0%,#ffffff_28%,#ffffff_100%)] p-3 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-montserrat font-semibold uppercase tracking-widest text-custom-light-600">
                Checkout
              </p>
              <h1 className="mt-1 text-2xl font-league-spartan font-bold text-custom-dark-1000 sm:text-3xl">
                Finalizar compra
              </h1>
              <p className="mt-2 text-sm font-montserrat text-custom-dark-700">
                Revise seus dados e confirme o pedido.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/cart">Voltar ao carrinho</Link>
            </Button>
          </div>
        </header>

        <div className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-6">
          <CheckoutForm />
        </div>
      </div>
    </div>
  );
}
