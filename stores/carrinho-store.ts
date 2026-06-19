"use client";

import { create } from "zustand";
import {
  clampQuantityToMax,
  computePaleteValue,
  normalizeNonNegativeInteger,
  normalizePositiveInteger,
} from "@/lib/produtos/paletePricing";

export type CartItem = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  unitPrice: number;
  qtPalete?: number | null;
  paleteValue?: number | null;
  maxQuantity?: number | null;
  embalagemUnits?: number | null;
  quantity: number;
};

const CART_STORAGE_KEY = "connect_ecommerce_cart_v1";

function normalizeEmbalagemUnits(value: number | undefined | null): number {
  if (!value || Number.isNaN(value) || value <= 1) return 1;
  return Math.floor(value);
}

function normalizePaleteValue(value: unknown, unitPrice: unknown, qtPalete: unknown): number | null {
  const explicit = typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
  if (explicit != null) return explicit;
  const derived = computePaleteValue(unitPrice, qtPalete);
  if (derived != null) return derived;
  return typeof unitPrice === "number" && Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : null;
}

function normalizeMaxQuantity(value: unknown): number | null {
  return normalizeNonNegativeInteger(value);
}

function computeTotalItems(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.quantity, 0);
}

function computeTotalAmount(items: CartItem[]): number {
  return items.reduce((acc, item) => {
    const paleteValue = normalizePaleteValue(item.paleteValue, item.unitPrice, item.qtPalete);
    if (paleteValue == null) return acc;
    return acc + paleteValue * item.quantity;
  }, 0);
}

export type CarrinhoState = {
  hasHydratedStorage: boolean;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  hydrateFromStorage: () => void;
  persistToStorage: () => void;
  addItem: (input: {
    id: string;
    name: string;
    category?: string;
    imageUrl?: string;
    unitPrice: number;
    qtPalete?: number | null;
    paleteValue?: number | null;
    maxQuantity?: number | null;
    embalagemUnits?: number | null;
    quantity?: number;
  }) => Promise<void>;
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
        const normalized = parsed.map((item) => ({
          ...item,
          qtPalete: normalizePositiveInteger(item?.qtPalete),
          paleteValue: normalizePaleteValue(item?.paleteValue, item?.unitPrice, item?.qtPalete),
          maxQuantity: normalizeMaxQuantity(item?.maxQuantity),
          embalagemUnits: normalizeEmbalagemUnits(item?.embalagemUnits),
          quantity: clampQuantityToMax(item?.quantity, item?.maxQuantity),
        }));
        set({
          items: normalized,
          totalItems: computeTotalItems(normalized),
          totalAmount: computeTotalAmount(normalized),
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
    const maxQuantity = normalizeMaxQuantity(input.maxQuantity);
    if (maxQuantity != null && maxQuantity <= 0) {
      throw new Error("Quantidade máxima indisponível para este produto.");
    }
    const quantity = clampQuantityToMax(input.quantity, maxQuantity);
    const embalagemUnits = normalizeEmbalagemUnits(input.embalagemUnits);
    const qtPalete = normalizePositiveInteger(input.qtPalete);
    const paleteValue = normalizePaleteValue(input.paleteValue, input.unitPrice, qtPalete);
    let alreadyInCart = false;
    const nextItems = (() => {
      const current = get().items;
      const existing = current.find((x) => x.id === input.id);
      if (existing) {
        alreadyInCart = true;
        return current.map((x) => {
          if (x.id !== input.id) return x;
          const existingUnits = normalizeEmbalagemUnits(x.embalagemUnits);
          const shouldUpdateUnits = embalagemUnits > 1 && existingUnits === 1;
          const mergedMaxQuantity = maxQuantity ?? normalizeMaxQuantity(x.maxQuantity);
          const nextQuantity = clampQuantityToMax(x.quantity + quantity, mergedMaxQuantity);
          return {
            ...x,
            quantity: nextQuantity,
            qtPalete: qtPalete ?? normalizePositiveInteger(x.qtPalete),
            paleteValue: paleteValue ?? normalizePaleteValue(x.paleteValue, x.unitPrice, x.qtPalete),
            maxQuantity: mergedMaxQuantity,
            embalagemUnits: shouldUpdateUnits ? embalagemUnits : existingUnits,
          };
        });
      }
      return [
        ...current,
        {
          id: input.id,
          name: input.name,
          category: input.category ?? "Sem categoria",
          imageUrl: input.imageUrl ?? "/placeholder.svg",
          unitPrice: Number.isFinite(input.unitPrice) ? input.unitPrice : 0,
          qtPalete,
          paleteValue,
          maxQuantity,
          embalagemUnits,
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

    const nextItems = get().items.flatMap((x) => {
      if (x.id !== id) return [x];
      const nextQuantity = clampQuantityToMax(quantity, x.maxQuantity);
      if (nextQuantity <= 0) return [];
      return [{ ...x, quantity: nextQuantity }];
    });
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

