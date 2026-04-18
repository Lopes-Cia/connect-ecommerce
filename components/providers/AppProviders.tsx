"use client";

import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import FrontModalHost from "@/components/providers/FrontModalHost";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <FrontModalHost />
      </CartProvider>
    </AuthProvider>
  );
}
