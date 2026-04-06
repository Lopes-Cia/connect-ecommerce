"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  PackageSearch,
  LayoutDashboard,
  ShoppingBasket,
  User,
  Settings,
  LogOut,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

function buildInitial(value: string | undefined): string {
  const safe = value?.trim();
  if (!safe) {
    return "U";
  }

  return safe.charAt(0).toUpperCase();
}

export default function DashboardSidebar() {
  const router = useRouter();
  const { user, isLoading, logoutUser } = useAuth();
  const userName = user?.name?.trim() || user?.email || "Usuario";
  const userInitial = buildInitial(user?.name || user?.email);
  const userRole = isLoading ? "Carregando" : "Distribuidor";

  async function handleLogout() {
    await logoutUser();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="hidden md:flex w-56 h-screen bg-tints-french-blue flex-col text-white sticky top-0 overflow-hidden">
      <div className="flex flex-col items-center pt-4 pb-3 px-4 shrink-0">
        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-tints-french-blue text-xl font-semibold mb-2">
          {userInitial}
        </div>
        <div className="text-white text-base font-medium truncate max-w-full">{userName}</div>
        <div className="text-white/70 text-sm">{userRole}</div>
      </div>

      <nav className="flex flex-col px-4 space-y-1 shrink-0 py-2">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 text-white hover:bg-white/10 rounded transition-colors text-sm"
        >
          <Home size={18} />
          <span>Voltar para Loja</span>
        </Link>

        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 text-white hover:bg-white/10 rounded transition-colors text-sm"
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/products"
          className="flex items-center gap-3 px-3 py-2 text-white hover:bg-white/10 rounded transition-colors text-sm"
        >
          <PackageSearch size={18} />
          <span>Produtos</span>
        </Link>



        <Link
          href="/dashboard/orders"
          className="flex items-center gap-3 px-3 py-2 text-white hover:bg-white/10 rounded transition-colors text-sm"
        >
          <ShoppingBasket size={18} />
          <span>Meus Pedidos</span>
        </Link>

        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 px-3 py-2 text-white hover:bg-white/10 rounded transition-colors text-sm"
        >
          <User size={18} />
          <span>Meus Dados</span>
        </Link>

        <Link
          href="/dashboard/automations"
          className="flex items-center gap-3 px-3 py-2 text-white hover:bg-white/10 rounded transition-colors text-sm"
        >
          <Settings size={18} />
          <span>Automações</span>
        </Link>
      </nav>

      <div className="px-4 pt-12 pb-3 shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-white hover:bg-white/10 rounded transition-colors text-sm"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}

