"use client";

import { create } from "zustand";

import { ApiError, apiClient } from "@/lib/api/client";
import { useClientesStore } from "@/stores/clientes-store";

type LoadStatus = "idle" | "loading" | "success" | "error";
type CartMode = "anonymous" | "server";

export type CartItem = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
};

type ServerCarrinhoItem = {
  itemId: number;
  produtoId: number;
  nome: string;
  imagemUrl?: string;
  precoUnitario: number;
  quantidade: number;
};

type CarrinhoData = {
  carrinhoId: number;
  clienteId: number;
  itens: ServerCarrinhoItem[];
  cupom?: { codigo: string } | null;
  resumo?: { totalItens?: number; total?: number; subtotal?: number; desconto?: number; frete?: number; moeda?: string };
};

const CART_STORAGE_KEY = "connect_ecommerce_cart_v1";

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

function normalizeQuantity(value: number | undefined): number {
  if (!value || Number.isNaN(value) || value <= 0) return 1;
  return Math.floor(value);
}

function computeTotalItems(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.quantity, 0);
}

function computeTotalAmount(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
}

function parseClienteId(): number | null {
  const loginData = useClientesStore.getState().loginData;
  const meus = asRecord(loginData?.meus_dados);
  const id = Number.parseInt(String(meus?.id ?? "").trim(), 10);
  return Number.isFinite(id) ? id : null;
}

function mapServerToCartItems(carrinho: CarrinhoData | null): CartItem[] {
  const itens = Array.isArray(carrinho?.itens) ? carrinho!.itens : [];
  return itens.map((i) => ({
    id: String(i.produtoId),
    name: String(i.nome ?? ""),
    category: "Sem categoria",
    imageUrl: String(i.imagemUrl ?? "/placeholder.svg"),
    unitPrice: Number.isFinite(i.precoUnitario) ? i.precoUnitario : 0,
    quantity: Number.isFinite(i.quantidade) ? i.quantidade : 1,
  }));
}

async function fetchCarrinhoServidor(clienteId: number): Promise<CarrinhoData | null> {
  const result = await apiClient<{ success: true; data: unknown }>(`carrinho/${clienteId}`, { method: "GET" });
  return (result?.data ?? null) as CarrinhoData | null;
}

export type CarrinhoState = {
  mode: CartMode;
  status: LoadStatus;
  error: string | null;
  hasHydratedStorage: boolean;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  hydrateFromStorage: () => void;
  persistToStorage: () => void;
  switchToServerIfLoggedIn: () => Promise<void>;
  syncAnonymousToServer: () => Promise<void>;
  refreshFromServer: () => Promise<void>;
  addItem: (input: { id: string; name: string; category?: string; imageUrl?: string; unitPrice: number; quantity?: number }) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  setItemQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
};

export const useCarrinhoStore = create<CarrinhoState>((set, get) => ({
  mode: "anonymous",
  status: "idle",
  error: null,
  hasHydratedStorage: false,
  items: [],
  totalItems: 0,
  totalAmount: 0,

  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) {
        set({ hasHydratedStorage: true });
        return;
      }
      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) {
        set({
          items: parsed,
          totalItems: computeTotalItems(parsed),
          totalAmount: computeTotalAmount(parsed),
          hasHydratedStorage: true,
        });
        return;
      }
    } catch {
    } finally {
      set({ hasHydratedStorage: true });
    }
  },

  persistToStorage: () => {
    if (typeof window === "undefined") return;
    const { hasHydratedStorage, items, mode } = get();
    if (!hasHydratedStorage) return;
    if (mode !== "anonymous") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  },

  switchToServerIfLoggedIn: async () => {
    const clienteId = parseClienteId();
    if (!clienteId) return;
    set({ mode: "server" });
    await get().syncAnonymousToServer();
    await get().refreshFromServer();
  },

  syncAnonymousToServer: async () => {
    const clienteId = parseClienteId();
    const { mode, items } = get();
    if (!clienteId) return;
    if (mode !== "server") return;

    set({ status: "loading", error: null });
    try {
      const serverCarrinho = await fetchCarrinhoServidor(clienteId);
      const serverItens = Array.isArray(serverCarrinho?.itens) ? serverCarrinho!.itens : [];

      for (const it of serverItens) {
        await apiClient<{ success: true; data: unknown }>(`carrinho/itens/${it.itemId}`, {
          method: "DELETE",
          body: JSON.stringify({ clienteId }),
        });
      }

      for (const localItem of items) {
        const produtoId = Number.parseInt(String(localItem.id ?? "").trim(), 10);
        if (!Number.isFinite(produtoId)) continue;
        await apiClient<{ success: true; data: unknown }>("carrinho/itens", {
          method: "POST",
          body: JSON.stringify({
            clienteId,
            item: { produtoId, quantidade: localItem.quantity },
          }),
        });
      }

      set({
        items: [],
        totalItems: 0,
        totalAmount: 0,
        status: "success",
      });
      if (typeof window !== "undefined") window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      set({ status: "error", error: getApiErrorMessage(error) });
      throw error;
    }
  },

  refreshFromServer: async () => {
    const clienteId = parseClienteId();
    const { mode } = get();
    if (!clienteId) return;
    if (mode !== "server") return;

    set({ status: "loading", error: null });
    try {
      const carrinho = await fetchCarrinhoServidor(clienteId);
      const mapped = mapServerToCartItems(carrinho);
      set({
        items: mapped,
        totalItems: computeTotalItems(mapped),
        totalAmount: computeTotalAmount(mapped),
        status: "success",
      });
    } catch (error) {
      set({ status: "error", error: getApiErrorMessage(error) });
      throw error;
    }
  },

  addItem: async (input) => {
    const { mode } = get();
    const quantity = normalizeQuantity(input.quantity);

    if (mode === "anonymous") {
      let alreadyInCart = false;
      const nextItems = (() => {
        const current = get().items;
        const existing = current.find((x) => x.id === input.id);
        if (existing) {
          alreadyInCart = true;
          return current.map((x) => (x.id === input.id ? { ...x, quantity: x.quantity + quantity } : x));
        }
        return [
          ...current,
          {
            id: input.id,
            name: input.name,
            category: input.category ?? "Sem categoria",
            imageUrl: input.imageUrl ?? "/placeholder.svg",
            unitPrice: Number.isFinite(input.unitPrice) ? input.unitPrice : 0,
            quantity,
          },
        ];
      })();

      set({
        items: nextItems,
        totalItems: computeTotalItems(nextItems),
        totalAmount: computeTotalAmount(nextItems),
      });
      get().persistToStorage();
      void alreadyInCart;
      return;
    }

    const clienteId = parseClienteId();
    if (!clienteId) throw new Error("Cliente não identificado. Faça login novamente.");
    const produtoId = Number.parseInt(String(input.id ?? "").trim(), 10);
    if (!Number.isFinite(produtoId)) throw new Error("produtoId inválido no carrinho.");

    await apiClient<{ success: true; data: unknown }>("carrinho/itens", {
      method: "POST",
      body: JSON.stringify({ clienteId, item: { produtoId, quantidade: quantity } }),
    });
    await get().refreshFromServer();
  },

  removeItem: async (id) => {
    const { mode } = get();
    if (mode === "anonymous") {
      const nextItems = get().items.filter((x) => x.id !== id);
      set({
        items: nextItems,
        totalItems: computeTotalItems(nextItems),
        totalAmount: computeTotalAmount(nextItems),
      });
      get().persistToStorage();
      return;
    }

    const clienteId = parseClienteId();
    if (!clienteId) throw new Error("Cliente não identificado. Faça login novamente.");
    const produtoId = Number.parseInt(String(id ?? "").trim(), 10);
    if (!Number.isFinite(produtoId)) throw new Error("produtoId inválido no carrinho.");

    const carrinho = await fetchCarrinhoServidor(clienteId);
    const item = (carrinho?.itens ?? []).find((x) => x.produtoId === produtoId) ?? null;
    if (!item) return;

    await apiClient<{ success: true; data: unknown }>(`carrinho/itens/${item.itemId}`, {
      method: "DELETE",
      body: JSON.stringify({ clienteId }),
    });
    await get().refreshFromServer();
  },

  setItemQuantity: async (id, quantity) => {
    const { mode } = get();
    if (quantity <= 0) {
      await get().removeItem(id);
      return;
    }

    if (mode === "anonymous") {
      const nextItems = get().items.map((x) => (x.id === id ? { ...x, quantity: Math.floor(quantity) } : x));
      set({
        items: nextItems,
        totalItems: computeTotalItems(nextItems),
        totalAmount: computeTotalAmount(nextItems),
      });
      get().persistToStorage();
      return;
    }

    const clienteId = parseClienteId();
    if (!clienteId) throw new Error("Cliente não identificado. Faça login novamente.");
    const produtoId = Number.parseInt(String(id ?? "").trim(), 10);
    if (!Number.isFinite(produtoId)) throw new Error("produtoId inválido no carrinho.");

    const carrinho = await fetchCarrinhoServidor(clienteId);
    const item = (carrinho?.itens ?? []).find((x) => x.produtoId === produtoId) ?? null;
    if (!item) return;

    await apiClient<{ success: true; data: unknown }>(`carrinho/itens/${item.itemId}`, {
      method: "PUT",
      body: JSON.stringify({ clienteId, patch: { quantidade: Math.floor(quantity) } }),
    });
    await get().refreshFromServer();
  },

  clearCart: async () => {
    const { mode } = get();
    if (mode === "anonymous") {
      set({ items: [], totalItems: 0, totalAmount: 0 });
      get().persistToStorage();
      return;
    }

    const clienteId = parseClienteId();
    if (!clienteId) throw new Error("Cliente não identificado. Faça login novamente.");
    const carrinho = await fetchCarrinhoServidor(clienteId);
    const itens = Array.isArray(carrinho?.itens) ? carrinho!.itens : [];
    for (const it of itens) {
      await apiClient<{ success: true; data: unknown }>(`carrinho/itens/${it.itemId}`, {
        method: "DELETE",
        body: JSON.stringify({ clienteId }),
      });
    }
    await get().refreshFromServer();
  },
}));

