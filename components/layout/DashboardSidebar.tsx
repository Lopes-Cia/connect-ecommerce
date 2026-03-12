"use client";

import Link from "next/link";
import {
  Home,
  PackageSearch,
  LayoutDashboard,
  ShoppingBasket,
  User,
  Settings,
  LogOut,
} from "lucide-react";

export default function DashboardSidebar() {
  // User placeholder data
  const user = {
    initial: "D",
    name: "Daniel",
    role: "Distribuidor",
  };

  // Logout handler placeholder
  async function handleLogout() {
    // TODO: Implement logout logic
    // Clear session/tokens here
    // Redirect to login page
    console.log("Logout clicked - implement actual logout logic");
  }

  return (
    <div className="hidden md:flex w-64 h-screen bg-[#7d1a1a] flex-col text-white sticky top-0 overflow-hidden">
      <div className="flex flex-col items-center pt-4 pb-3 px-4 flex-shrink-0">
        <div className="w-14 h-14 rounded-full bg-[#5d1414] flex items-center justify-center text-white text-xl font-semibold mb-2">
          {user.initial}
        </div>
        <div className="text-white text-base font-medium">{user.name}</div>
        <div className="text-white/70 text-sm">{user.role}</div>
      </div>

      <nav className="flex flex-col px-4 space-y-1 flex-shrink-0 py-2">
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

      <div className="px-4 pt-12 pb-3 flex-shrink-0">
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

