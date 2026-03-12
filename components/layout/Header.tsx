"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchBar from "./SearchBar";
import CartSidebarMenu from "./CartSidebarMenu";
import SidebarMenu from "./SidebarMenu";
import { Button } from "../ui/button";
import { ShieldUser } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard) {
    return <DashboardHeader />;
  }

  return <ShopHeader />;
}

function ShopHeader() {
  return (
    <header className="w-full bg-tints-french-blue">
      <div className="max-w-[var(--width-content-md)] lg:max-w-[var(--width-content-lg)] mx-auto flex flex-col md:flex-row justify-between items-center py-4 xs:px-4 sm:px-6 md:px-8 2xl:px-0 gap-2">
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
          <Link href="/login">
            <Button
              variant="outline"
              size="default"
              aria-label="Submit"
              className="cursor-pointer hover:opacity-75 rounded-xs"
            >
              <ShieldUser />
              Entrar
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function DashboardHeader() {
  return (
    <header className="w-full max-h-fit flex justify-between items-center bg-tints-french-blue py-4 px-6 gap-2">
      <Link href="/">
        <Image src="/logo.png" alt="Newbread Logo" width={100} height={400} />
      </Link>
      <div className="w-fit flex flex-row items-center gap-6">
        <CartSidebarMenu />
        <SidebarMenu />
      </div>
    </header>
  );
}
