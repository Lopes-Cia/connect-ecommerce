"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface CartItem {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
}

interface AddCartItemInput {
  id: string;
  name: string;
  category?: string;
  imageUrl?: string;
  unitPrice: number;
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
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) {
        return parsed;
      }

      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((input: AddCartItemInput) => {
    setItems((current) => {
      const quantity = normalizeQuantity(input.quantity);
      const existing = current.find((item) => item.id === input.id);

      if (existing) {
        return current.map((item) =>
          item.id === input.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
              }
            : item
        );
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
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const setItemQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.floor(quantity),
            }
          : item
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const totalAmount = useMemo(
    () => items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    [items]
  );

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
