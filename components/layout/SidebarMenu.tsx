"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Home,
  PackageSearch,
  LayoutDashboard,
  ShoppingBasket,
  User,
  UserLock,
  Settings,
  LogOut,
  LogIn,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import useCheckIsMobile from "@/hooks/useCheckIsMobile";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function SidebarMenu() {
  const { user, isAuthenticated, logoutUser } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  function toggleMenu() {
    setIsOpen(!isOpen);
  }

  // Click-outside detection
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleLogout() {
    await logoutUser();
    setIsOpen(false);
    router.push("/login");
  }

  const displayName = user?.name?.trim() || user?.email || "Usuário";
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative flex items-center">
      <button aria-label="Open menu" onClick={toggleMenu} className="cursor-pointer">
        <Menu size={24} color="white" />
      </button>
      {isOpen && (
        isAuthenticated ? (
          <AuthenticatedSidebar
            sidebarRef={sidebarRef}
            onClose={() => setIsOpen(false)}
            handleLogout={handleLogout}
            displayName={displayName}
            displayInitial={displayInitial}
          />
        ) : (
          <GuestSidebar
            sidebarRef={sidebarRef}
            onClose={() => setIsOpen(false)}
          />
        )
      )}
    </div>
  );
}

interface BaseSidebarProps {
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

interface AuthenticatedSidebarProps extends BaseSidebarProps {
  handleLogout: () => void;
  displayName: string;
  displayInitial: string;
}

function GuestSidebar({ sidebarRef, onClose }: BaseSidebarProps) {
  const isMobile = useCheckIsMobile();

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "fixed top-0 h-full w-80 bg-tints-french-blue z-50 flex flex-col text-white",
        isMobile ? "left-0" : "right-0",
      )}
    >
      <button
        onClick={onClose}
        className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded transition-colors cursor-pointer"
        aria-label="Close sidebar"
      >
        <X size={24} color="white" />
      </button>

      <nav className="flex-1 flex flex-col justify-center px-6 space-y-2">
        <Link
          href="/login"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2 text-white hover:bg-white/10 rounded transition-colors"
        >
          <LogIn size={20} />
          <span>Fazer Login</span>
        </Link>
        <Link
          href="/register"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2 text-white hover:bg-white/10 rounded transition-colors"
        >
          <UserLock size={20} />
          <span>Cadastre-se</span>
        </Link>
      </nav>
    </div>
  );
}

function AuthenticatedSidebar({ sidebarRef, onClose, handleLogout, displayName, displayInitial }: AuthenticatedSidebarProps) {
  const isMobile = useCheckIsMobile();

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "fixed top-0 h-full w-80 bg-tints-french-blue z-50 flex flex-col text-white",
        isMobile ? "left-0" : "right-0",
      )}
    >
      <button
        onClick={onClose}
        className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded transition-colors cursor-pointer"
        aria-label="Close sidebar"
      >
        <X size={24} color="white" />
      </button>

      <div className="flex flex-col items-center pt-16 pb-8 px-6">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-tints-french-blue text-2xl font-semibold mb-3">
          {displayInitial}
        </div>
        <div className="text-white text-lg font-medium">{displayName}</div>
      </div>

      <nav className="flex-1 flex flex-col px-6 space-y-2">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2 text-white hover:bg-white/10 rounded transition-colors"
        >
          <Home size={20} />
          <span>Home</span>
        </Link>

        <Link
          href="/products"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2 text-white hover:bg-white/10 rounded transition-colors"
        >
          <PackageSearch size={20} />
          <span>Produtos</span>
        </Link>

        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-2 text-white hover:bg-white/10 rounded transition-colors"
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/dashboard/orders"
          className="flex items-center gap-3 px-4 py-2 text-white hover:bg-white/10 rounded transition-colors"
        >
          <ShoppingBasket size={20} />
          <span>Meus Pedidos</span>
        </Link>

        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 px-4 py-2 text-white hover:bg-white/10 rounded transition-colors"
        >
          <User size={20} />
          <span>Meus Dados</span>
        </Link>

        <Link
          href="/dashboard/automations"
          className="flex items-center gap-3 px-4 py-2 text-white hover:bg-white/10 rounded transition-colors"
        >
          <Settings size={20} />
          <span>Automações</span>
        </Link>
      </nav>

      <div className="px-6 pb-6">
        <button
          onClick={handleLogout}
          className="flex items-center cursor-pointer gap-3 w-full px-4 py-3 text-white hover:bg-white/10 rounded transition-colors"
        >
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
