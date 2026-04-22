import { create } from "zustand";

import { ApiError, apiClient } from "@/lib/api/client";

type LoadStatus = "idle" | "loading" | "success" | "error";

function setClientesLoggedInCookie(value: boolean) {
  if (typeof document === "undefined") return;
  if (!value) {
    document.cookie = "clientes_logged_in=; Path=/; Max-Age=0; SameSite=Lax";
    return;
  }

  document.cookie = "clientes_logged_in=1; Path=/; Max-Age=604800; SameSite=Lax";
}

function readClientesLoggedInCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith("clientes_logged_in=1"));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

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
  /**
   * Contrato novo (connect): dados do cliente ficam aqui.
   * Ex.: { id, nome, email, whatsapp, ... }
   */
  meus_dados?: unknown;
  enderecos?: unknown;
  privacidade?: unknown;
  [key: string]: unknown;
};

export function pickMeusDados(loginData: ClienteLoginData | null): Record<string, unknown> | null {
  return asRecord(loginData?.meus_dados) ?? null;
}

export function pickPrivacidade(loginData: ClienteLoginData | null): Record<string, unknown> | null {
  return asRecord(loginData?.privacidade) ?? null;
}

export function pickDoisFatores(loginData: ClienteLoginData | null): Record<string, unknown> | null {
  const privacidade = asRecord(loginData?.privacidade);
  return asRecord(privacidade?.doisFatores) ?? null;
}

export type ClientesState = {
  loginStatus: LoadStatus;
  loginError: string | null;
  loginData: ClienteLoginData | null;
  isLoggedIn: boolean;
  login: (input: { email: string; senha: string }) => Promise<ClienteLoginData>;
  setLoggedIn: (next: { isLoggedIn: boolean; loginData?: ClienteLoginData | null }) => void;
  updateMeusDados: (patch: Record<string, unknown>) => Promise<ClienteLoginData>;
  updatePrivacidade: (patch: Record<string, unknown>) => Promise<ClienteLoginData>;
  listEnderecos: () => Promise<unknown[]>;
  createEndereco: (endereco: Record<string, unknown>) => Promise<unknown[]>;
  updateEndereco: (enderecoId: number, patch: Record<string, unknown>) => Promise<unknown[]>;
  deleteEndereco: (enderecoId: number) => Promise<unknown[]>;
  logout: () => void;
  reset: () => void;
};

const INITIAL: Pick<ClientesState, "loginStatus" | "loginError" | "loginData" | "isLoggedIn"> = {
  loginStatus: "idle",
  loginError: null,
  loginData: null,
  isLoggedIn: readClientesLoggedInCookie(),
};

function getClienteIdFromLoginData(loginData: ClienteLoginData | null): number | null {
  const meus = asRecord(loginData?.meus_dados);
  const id = Number.parseInt(String(meus?.id ?? "").trim(), 10);
  return Number.isFinite(id) ? id : null;
}

function ensureLoggedIn(loginData: ClienteLoginData | null): number {
  const clienteId = getClienteIdFromLoginData(loginData);
  if (!clienteId) throw new Error("Cliente não identificado. Faça login novamente.");
  return clienteId;
}

function mergeLoginData(
  current: ClienteLoginData | null,
  patch: Partial<ClienteLoginData>
): ClienteLoginData | null {
  if (!current) return current;
  return { ...current, ...patch };
}

export const useClientesStore = create<ClientesState>((set, get) => ({
  ...INITIAL,

  setLoggedIn: ({ isLoggedIn, loginData }) => {
    setClientesLoggedInCookie(isLoggedIn);
    set((state) => ({
      ...state,
      isLoggedIn,
      loginStatus: isLoggedIn ? "success" : "idle",
      loginError: null,
      ...(loginData !== undefined ? { loginData } : {}),
    }));
  },

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

      const data = (result?.data ?? null) as ClienteLoginData | null;
      set({ loginStatus: "success", loginData: data, isLoggedIn: Boolean(data?.token) });
      return data ?? {};
    } catch (error) {
      const message = getApiErrorMessage(error);
      set({ loginStatus: "error", loginError: message, loginData: null, isLoggedIn: false });
      throw error;
    }
  },

  updateMeusDados: async (patch) => {
    const state = get();
    const clienteId = ensureLoggedIn(state.loginData);

    try {
      const result = await apiClient<{ success: true; data: unknown }>("clientes/meus-dados", {
        method: "PUT",
        body: JSON.stringify({ clienteId, patch }),
      });

      const payload = asRecord(result?.data);
      const next = mergeLoginData(state.loginData, {
        ...(payload?.meus_dados !== undefined ? { meus_dados: payload.meus_dados } : {}),
        ...(payload?.enderecos !== undefined ? { enderecos: payload.enderecos } : {}),
        ...(payload?.privacidade !== undefined ? { privacidade: payload.privacidade } : {}),
      });

      set({ loginData: next });
      return next ?? {};
    } catch (error) {
      const message = getApiErrorMessage(error);
      throw new Error(message);
    }
  },

  updatePrivacidade: async (patch) => {
    const state = get();
    const clienteId = ensureLoggedIn(state.loginData);

    try {
      const result = await apiClient<{ success: true; data: unknown }>("clientes/privacidade", {
        method: "PUT",
        body: JSON.stringify({ clienteId, patch }),
      });

      const payload = asRecord(result?.data);
      const privacidade = payload?.privacidade ?? result?.data;
      const next = mergeLoginData(state.loginData, { privacidade });
      set({ loginData: next });
      return next ?? {};
    } catch (error) {
      const message = getApiErrorMessage(error);
      throw new Error(message);
    }
  },

  listEnderecos: async () => {
    const state = get();
    const clienteId = ensureLoggedIn(state.loginData);

    try {
      const result = await apiClient<{ success: true; data: unknown }>(
        `clientes/enderecos/cliente/${encodeURIComponent(String(clienteId))}`,
        { method: "GET" }
      );

      const list = Array.isArray(result?.data) ? result.data : [];
      const next = mergeLoginData(state.loginData, { enderecos: list });
      set({ loginData: next });
      return list;
    } catch (error) {
      const message = getApiErrorMessage(error);
      throw new Error(message);
    }
  },

  createEndereco: async (endereco) => {
    const state = get();
    const clienteId = ensureLoggedIn(state.loginData);

    try {
      const result = await apiClient<{ success: true; data: unknown }>("clientes/enderecos", {
        method: "POST",
        body: JSON.stringify({ clienteId, endereco }),
      });

      const list = Array.isArray(result?.data) ? result.data : [];
      const next = mergeLoginData(state.loginData, { enderecos: list });
      set({ loginData: next });
      return list;
    } catch (error) {
      const message = getApiErrorMessage(error);
      throw new Error(message);
    }
  },

  updateEndereco: async (enderecoId, patch) => {
    const state = get();
    const clienteId = ensureLoggedIn(state.loginData);

    if (!Number.isFinite(enderecoId)) throw new Error("enderecoId inválido.");

    try {
      const result = await apiClient<{ success: true; data: unknown }>(
        `clientes/enderecos/${encodeURIComponent(String(enderecoId))}`,
        {
          method: "PUT",
          body: JSON.stringify({ clienteId, patch }),
        }
      );

      const list = Array.isArray(result?.data) ? result.data : [];
      const next = mergeLoginData(state.loginData, { enderecos: list });
      set({ loginData: next });
      return list;
    } catch (error) {
      const message = getApiErrorMessage(error);
      throw new Error(message);
    }
  },

  deleteEndereco: async (enderecoId) => {
    const state = get();
    const clienteId = ensureLoggedIn(state.loginData);

    if (!Number.isFinite(enderecoId)) throw new Error("enderecoId inválido.");

    try {
      const result = await apiClient<{ success: true; data: unknown }>(
        `clientes/enderecos/${encodeURIComponent(String(enderecoId))}`,
        {
          method: "DELETE",
          body: JSON.stringify({ clienteId }),
        }
      );

      const list = Array.isArray(result?.data) ? result.data : [];
      const next = mergeLoginData(state.loginData, { enderecos: list });
      set({ loginData: next });
      return list;
    } catch (error) {
      const message = getApiErrorMessage(error);
      throw new Error(message);
    }
  },

  logout: () => {
    setClientesLoggedInCookie(false);
    set({ ...INITIAL });
  },
  reset: () => {
    setClientesLoggedInCookie(false);
    set({ ...INITIAL });
  },
}));

