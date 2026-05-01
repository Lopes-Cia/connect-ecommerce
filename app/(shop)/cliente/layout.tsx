"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { frontModal } from "@/stores/front-modal-store";
import ClienteSidebar from "@/components/layout/ClienteSidebar";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/cliente/painel", label: "Painel" },
  { href: "/cliente/meus-dados", label: "Meus dados" },
  { href: "/cliente/meus-enderecos", label: "Meus endereços" },
  { href: "/cliente/privacidade", label: "Privacidade" },
  { href: "/cliente/meus-pedidos", label: "Meus pedidos" },
];

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, logoutUser } = useAuth();
  const openedLoginModalRef = useRef(false);

  async function handleLogout() {
    const confirmed = await frontModal.confirm({
      title: "Sair da conta",
      description: "Tem certeza que deseja sair?",
      confirmText: "Sair",
      cancelText: "Cancelar",
      confirmVariant: "destructive",
    });

    if (!confirmed) return;

    await logoutUser();
    router.push("/login");
  }

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) return;
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
      router.replace("/login");
    })();
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f7f8_0%,#ffffff_28%,#ffffff_100%)] p-3 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex gap-6">
          <ClienteSidebar />
          <main className="flex-1 min-w-0 space-y-6">
            <header className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-montserrat font-semibold uppercase tracking-widest text-custom-light-600">
                    Área do cliente
                  </p>
                  <h1 className="mt-1 text-2xl font-league-spartan font-bold text-custom-dark-1000 sm:text-3xl">
                    Minha conta
                  </h1>
                  <p className="mt-2 text-sm font-montserrat text-custom-dark-700">
                    Gerencie seus dados, endereços e privacidade.
                  </p>
                </div>

                <div className="md:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleLogout()}
                  >
                    Sair
                  </Button>
                </div>

                <div className="hidden md:block">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleLogout()}
                  >
                    Sair
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 md:hidden">
                {LINKS.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-full border px-3 py-2 text-xs font-montserrat font-semibold transition ${
                        active
                          ? "border-tints-french-blue bg-tints-french-blue text-white"
                          : "border-custom-light-300 bg-white text-custom-dark-1000 hover:bg-custom-light-200"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </header>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
