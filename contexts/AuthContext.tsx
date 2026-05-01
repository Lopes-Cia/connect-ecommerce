"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getClienteLojaFromSession, getCurrentSession, logout } from "@/lib/api/auth";
import type { Session } from "@/lib/auth/session";
import { useClientesStore } from "@/stores/clientes-store";

interface AuthContextValue {
  user: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const setLoggedIn = useClientesStore((s) => s.setLoggedIn);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getCurrentSession();
      if (!response.success || !response.data) {
        setUser(null);
        setLoggedIn({ isLoggedIn: false, loginData: null });
        return;
      }

      const session = response.data;
      setUser(session);

      const baseLoginData: Record<string, unknown> = {
        token: session.token,
        meus_dados: {
          id: String(session.cliente?.customerId ?? session.userId ?? "").trim(),
          nome: String(session.cliente?.nome ?? session.name ?? "").trim() || undefined,
          email: String(session.cliente?.email ?? session.email ?? "").trim() || undefined,
          cnpjCliente: String(session.cliente?.cnpj ?? "").trim() || undefined,
        },
      };

      try {
        const clienteResponse = await getClienteLojaFromSession();
        const clienteLojaData = clienteResponse.clienteLoja?.data;
        const clienteLoja =
          clienteLojaData && typeof clienteLojaData === "object" && !Array.isArray(clienteLojaData)
            ? (clienteLojaData as Record<string, unknown>)
            : null;

        const customerId = clienteLoja ? Number(clienteLoja.customerId) : Number.NaN;
        const cnpjCliente = clienteLoja ? String(clienteLoja.cgc ?? "").trim() : "";
        const email = clienteLoja ? String(clienteLoja.email ?? "").trim() : "";
        const nome = clienteLoja ? String(clienteLoja.cliente ?? "").trim() : "";
        const telefone = clienteLoja ? String(clienteLoja.telefone ?? "").trim() : "";
        const enderecos = clienteLoja?.enderecos;

        setLoggedIn({
          isLoggedIn: true,
          loginData: {
            ...baseLoginData,
            meus_dados: {
              ...(baseLoginData.meus_dados as Record<string, unknown>),
              ...(Number.isFinite(customerId) && customerId > 0 ? { id: String(customerId) } : {}),
              ...(cnpjCliente ? { cnpjCliente } : {}),
              ...(email ? { email } : {}),
              ...(nome ? { nome } : {}),
              ...(telefone ? { telefone, whatsapp: telefone, fone: telefone } : {}),
            },
            ...(enderecos !== undefined ? { enderecos } : {}),
          },
        });
      } catch {
        setLoggedIn({ isLoggedIn: true, loginData: baseLoginData });
      }
    } catch {
      setUser(null);
      setLoggedIn({ isLoggedIn: false, loginData: null });
    } finally {
      setIsLoading(false);
    }
  }, [setLoggedIn]);

  const logoutUser = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      setLoggedIn({ isLoggedIn: false, loginData: null });
    }
  }, [setLoggedIn]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      refreshSession,
      logoutUser,
    }),
    [isLoading, logoutUser, refreshSession, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
