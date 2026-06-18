"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { frontModal } from "@/stores/front-modal-store";
import { useCarrinhoStore } from "@/stores/carrinho-store";

export interface CartItem {
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
}

interface AddCartItemInput {
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
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  addItem: (input: AddCartItemInput) => void;
  removeItem: (id: string) => void;
  setItemQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CART_STORAGE_KEY = "connect_ecommerce_cart_v1";

const CartContext = createContext<CartContextValue | null>(null);

function normalizeQuantity(value: number | undefined): number {
  if (!value || Number.isNaN(value) || value <= 0) {
    return 1;
  }

  return Math.floor(value);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useCarrinhoStore((s) => s.items) as CartItem[];
  const totalItems = useCarrinhoStore((s) => s.totalItems);
  const totalAmount = useCarrinhoStore((s) => s.totalAmount);
  const hydrateFromStorage = useCarrinhoStore((s) => s.hydrateFromStorage);
  const persistToStorage = useCarrinhoStore((s) => s.persistToStorage);
  const addItemStore = useCarrinhoStore((s) => s.addItem);
  const removeItemStore = useCarrinhoStore((s) => s.removeItem);
  const setItemQuantityStore = useCarrinhoStore((s) => s.setItemQuantity);
  const clearCartStore = useCarrinhoStore((s) => s.clearCart);

  useEffect(() => {
    void hydrateFromStorage();
  }, []);

  useEffect(() => {
    void persistToStorage();
  }, [items, persistToStorage]);

  async function addItem(input: AddCartItemInput) {
    const quantity = normalizeQuantity(input.quantity);
    const existed = items.some((x) => x.id === input.id);
    await addItemStore({
      id: input.id,
      name: input.name,
      category: input.category ?? "Sem categoria",
      imageUrl: input.imageUrl ?? "/placeholder.svg",
      unitPrice: input.unitPrice,
      qtPalete: input.qtPalete,
      paleteValue: input.paleteValue,
      maxQuantity: input.maxQuantity,
      embalagemUnits: input.embalagemUnits,
      quantity,
    });
    void frontModal.success({
      title: existed ? "Quantidade atualizada" : "Adicionado ao carrinho",
      description: existed
        ? `${input.name} teve a quantidade atualizada no seu carrinho.`
        : `${input.name} foi adicionado no seu carrinho.`,
    });
  }

  async function removeItem(id: string) {
    await removeItemStore(id);
  }

  async function setItemQuantity(id: string, quantity: number) {
    await setItemQuantityStore(id, quantity);
  }

  async function clearCart() {
    await clearCartStore();
    if (typeof window !== "undefined") window.localStorage.removeItem(CART_STORAGE_KEY);
  }

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalItems,
      totalAmount,
      addItem,
      removeItem,
      setItemQuantity,
      clearCart,
    }),
    [
      addItem,
      clearCart,
      items,
      removeItem,
      setItemQuantity,
      totalAmount,
      totalItems,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
