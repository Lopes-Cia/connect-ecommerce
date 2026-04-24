"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SearchBar from "./SearchBar";
import CartSidebarMenu from "./CartSidebarMenu";
import SidebarMenu from "./SidebarMenu";
import { Button } from "../ui/button";
import { LayoutDashboard, LogOut, ShieldUser } from "lucide-react";

import { useClientesStore } from "@/stores/clientes-store";
import { frontModal } from "@/stores/front-modal-store";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  return <ShopHeader />;
}

function ShopHeader() {
  const router = useRouter();
  const clientesIsLoggedIn = useClientesStore((s) => s.isLoggedIn);
  const clientesLogout = useClientesStore((s) => s.logout);
  const { isAuthenticated, logoutUser } = useAuth();
  const isLoggedIn = isAuthenticated || clientesIsLoggedIn;
  const myAccountHref = "/cliente/painel";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isLoggedInHydrated = mounted ? isLoggedIn : false;
  const myAccountHrefHydrated = mounted ? myAccountHref : "/login";

  function handleLoginClick() {
    router.push(isLoggedInHydrated ? myAccountHrefHydrated : "/login");
  }

  async function handleLogout() {
    const confirmed = await frontModal.confirm({
      title: "Sair da conta",
      description: "Tem certeza que deseja sair?",
      confirmText: "Sair",
      cancelText: "Cancelar",
      confirmVariant: "destructive",
    });

    if (!confirmed) return;

    if (isAuthenticated) {
      await logoutUser();
    }
    if (clientesIsLoggedIn) {
      clientesLogout();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="w-full bg-tints-french-blue">
      <div className="max-w-(--width-content-md) lg:max-w-(--width-content-lg) mx-auto flex flex-col md:flex-row justify-between items-center py-4 xs:px-4 sm:px-6 md:px-8 2xl:px-0 gap-2">
        <Link href="/">
          <Image src="/logo.png" alt="Newbread Logo" width={100} height={400} />
        </Link>

        {/* Mobile: sidebar + search + cart in a row */}
        <div className="w-full flex flex-row justify-between items-center gap-4 md:hidden">
          <SidebarMenu />
          <SearchBar />
          <CartSidebarMenu />
        </div>

        {/* Desktop: search bar then icons */}
        <div className="hidden md:block w-125 mx-4">
          <SearchBar />
        </div>

        <div className="hidden md:flex flex-row items-center gap-6">
          <CartSidebarMenu />
          {isLoggedInHydrated ? (
            <>
              <Button
                asChild
                variant="outline"
                size="default"
                aria-label="Minha conta"
                className="cursor-pointer hover:opacity-75 rounded-xs"
              >
                <Link href={myAccountHrefHydrated}>
                  <LayoutDashboard />
                  Minha conta
                </Link>
              </Button>
              <Button
                variant="outline"
                size="default"
                aria-label="Sair"
                className="cursor-pointer hover:opacity-75 rounded-xs"
                onClick={handleLogout}
              >
                <LogOut />
                Sair
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="default"
              aria-label="Entrar"
              className="cursor-pointer hover:opacity-75 rounded-xs"
              onClick={handleLoginClick}
            >
              <ShieldUser />
              Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
