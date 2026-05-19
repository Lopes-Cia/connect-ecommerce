"use client";

import { create } from "zustand";

export type CartItem = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
};

const CART_STORAGE_KEY = "connect_ecommerce_cart_v1";

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

export type CarrinhoState = {
  hasHydratedStorage: boolean;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  hydrateFromStorage: () => void;
  persistToStorage: () => void;
  addItem: (input: { id: string; name: string; category?: string; imageUrl?: string; unitPrice: number; quantity?: number }) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  setItemQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
};

export const useCarrinhoStore = create<CarrinhoState>((set, get) => ({
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
    const { hasHydratedStorage, items } = get();
    if (!hasHydratedStorage) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  },

  addItem: async (input) => {
    const quantity = normalizeQuantity(input.quantity);
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
  },

  removeItem: async (id) => {
    const nextItems = get().items.filter((x) => x.id !== id);
    set({
      items: nextItems,
      totalItems: computeTotalItems(nextItems),
      totalAmount: computeTotalAmount(nextItems),
    });
    get().persistToStorage();
  },

  setItemQuantity: async (id, quantity) => {
    if (quantity <= 0) {
      await get().removeItem(id);
      return;
    }

    const nextItems = get().items.map((x) => (x.id === id ? { ...x, quantity: Math.floor(quantity) } : x));
    set({
      items: nextItems,
      totalItems: computeTotalItems(nextItems),
      totalAmount: computeTotalAmount(nextItems),
    });
    get().persistToStorage();
  },

  clearCart: async () => {
    set({ items: [], totalItems: 0, totalAmount: 0 });
    get().persistToStorage();
  },
}));

