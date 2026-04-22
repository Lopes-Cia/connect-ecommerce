"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, User, MapPinHouse, ShieldCheck, ShoppingBasket, LogOut, Monitor } from "lucide-react";

import { pickMeusDados, useClientesStore } from "@/stores/clientes-store";
import { frontModal } from "@/stores/front-modal-store";

function getInitial(value: string): string {
  const safe = value.trim();
  if (!safe) return "C";
  return safe.charAt(0).toUpperCase();
}

const MENU = [
  { href: "/cliente/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/dashboard", label: "Dashboard", icon: Monitor },
  { href: "/cliente/meus-dados", label: "Meus dados", icon: User },
  { href: "/cliente/meus-enderecos", label: "Meus endereços", icon: MapPinHouse },
  { href: "/cliente/privacidade", label: "Privacidade", icon: ShieldCheck },
  { href: "/cliente/meus-pedidos", label: "Meus pedidos", icon: ShoppingBasket },
];

export default function ClienteSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const loginData = useClientesStore((s) => s.loginData);
  const logout = useClientesStore((s) => s.logout);

  async function handleLogout() {
    const confirmed = await frontModal.confirm({
      title: "Sair da conta",
      description: "Tem certeza que deseja sair?",
      confirmText: "Sair",
      cancelText: "Cancelar",
      confirmVariant: "destructive",
    });

    if (!confirmed) return;

    logout();
    router.push("/login");
  }

  const cliente = pickMeusDados(loginData);
  const nome =
    String(cliente?.nome ?? cliente?.name ?? loginData?.email ?? "Cliente").trim() || "Cliente";
  const initial = getInitial(nome);

  return (
    <aside className="hidden md:flex w-72 flex-col rounded-2xl border border-custom-light-300 bg-white p-5 shadow-sm h-[calc(100vh-4rem)] sticky top-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-tints-french-blue flex items-center justify-center text-white text-lg font-semibold shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-custom-dark-1000 text-sm font-semibold truncate">{nome}</div>
          <div className="text-custom-dark-700 text-xs">Área do cliente</div>
        </div>
      </div>

      <nav className="mt-6 flex flex-col space-y-2">
        {MENU.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors text-sm font-montserrat ${
                active
                  ? "border-tints-french-blue bg-tints-french-blue text-white"
                  : "border-custom-light-300 bg-white text-custom-dark-1000 hover:bg-custom-light-200"
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8">
        <button
          onClick={() => void handleLogout()}
          className="flex items-center gap-3 w-full rounded-lg border border-custom-light-300 px-3 py-2 text-custom-dark-1000 hover:bg-custom-light-200 transition-colors text-sm cursor-pointer font-montserrat"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
