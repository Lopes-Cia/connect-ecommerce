import { create } from "zustand";

import { ApiError, apiClient } from "@/lib/api/client";

type LoadStatus = "idle" | "loading" | "success" | "error";

function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const data = error.data as { message?: unknown; error?: unknown } | undefined;
    if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
    if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Erro inesperado";
}

export type ClienteLoginData = {
  token?: string;
  cliente?: unknown;
  enderecos?: unknown;
  privacidade?: unknown;
  [key: string]: unknown;
};

export type ClientesState = {
  loginStatus: LoadStatus;
  loginError: string | null;
  loginData: ClienteLoginData | null;
  isLoggedIn: boolean;
  login: (input: { email: string; senha: string }) => Promise<ClienteLoginData>;
  logout: () => void;
  reset: () => void;
};

const INITIAL: Pick<ClientesState, "loginStatus" | "loginError" | "loginData" | "isLoggedIn"> = {
  loginStatus: "idle",
  loginError: null,
  loginData: null,
  isLoggedIn: false,
};

export const useClientesStore = create<ClientesState>((set) => ({
  ...INITIAL,

  login: async ({ email, senha }) => {
    const safeEmail = String(email ?? "").trim();
    const safeSenha = String(senha ?? "");

    if (!safeEmail || !safeSenha) {
      set({ loginStatus: "error", loginError: "Email e senha sao obrigatorios.", loginData: null });
      throw new Error("Email e senha sao obrigatorios.");
    }

    set({ loginStatus: "loading", loginError: null });
    try {
      const result = await apiClient<{ success: true; data: ClienteLoginData }>("clientes/login", {
        method: "POST",
        body: JSON.stringify({ email: safeEmail, senha: safeSenha }),
      });

      const data = result?.data ?? null;
      set({ loginStatus: "success", loginData: data, isLoggedIn: Boolean(data?.token) });
      return data ?? {};
    } catch (error) {
      const message = getApiErrorMessage(error);
      set({ loginStatus: "error", loginError: message, loginData: null, isLoggedIn: false });
      throw error;
    }
  },

  logout: () => set({ ...INITIAL }),
  reset: () => set({ ...INITIAL }),
}));

