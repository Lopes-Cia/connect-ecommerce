"use client";

import { ShoppingCart, X, Trash2, Plus, Minus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import useCheckIsMobile from "@/hooks/useCheckIsMobile";
import { cn } from "@/lib/utils";

// Temporary interface for cart items
interface CartItem {
  id: string;
  name: string;
  weight: string;
  unitInfo: string;
  quantity: number;
  price: number;
}

export default function CartSidebarMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  function toggleCart() {
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

  return (
    <div className="relative flex items-center">
      <button
        aria-label="Open cart"
        onClick={toggleCart}
        className="cursor-pointer"
      >
        <ShoppingCart size={24} color="white" />
      </button>
      {isOpen && (
        <CartSidebar
          sidebarRef={sidebarRef}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

interface CartSidebarProps {
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

function CartSidebar({ sidebarRef, onClose }: CartSidebarProps) {
  const isMobile = useCheckIsMobile();

  // Temporary cart data - will be replaced with actual cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: "1",
      name: "Refrigerante Cola 2L",
      weight: "R$ 8,50",
      unitInfo: "garrafa",
      quantity: 50,
      price: 425.0,
    },
    {
      id: "2",
      name: "Suco Natural Laranja 1L",
      weight: "R$ 11,00",
      unitInfo: "garrafa",
      quantity: 50,
      price: 550.0,
    },
    {
      id: "3",
      name: "Cerveja Premium 600ml",
      weight: "R$ 22,00",
      unitInfo: "unidade",
      quantity: 30,
      price: 660.0,
    },
  ]);

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };

  const total = cartItems.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = () => {
    // TODO: Implement checkout logic
    console.log("Finalizar Pedido clicked");
  };

  const handleContinueShopping = () => {
    onClose();
  };

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "fixed top-0 h-full w-80 bg-white z-50 flex flex-col shadow-2xl",
        isMobile ? "left-0" : "right-0"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <ShoppingCart size={20} className="text-gray-700" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Carrinho</h2>
            <p className="text-sm text-gray-500">
              {cartItems.length} {cartItems.length === 1 ? "item" : "itens"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded transition-colors cursor-pointer"
          aria-label="Close cart"
        >
          <X size={20} className="text-gray-700" />
        </button>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ShoppingCart size={48} className="mb-2 opacity-30" />
            <p>Seu carrinho está vazio</p>
          </div>
        ) : (
          cartItems.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.weight} / {item.unitInfo}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"
                  aria-label="Remove item"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 border border-gray-300 rounded">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 hover:bg-gray-100 cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} className="text-gray-700" />
                  </button>
                  <span className="text-sm font-medium text-gray-900 min-w-[2rem] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 hover:bg-gray-100 cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} className="text-gray-700" />
                  </button>
                </div>
                <div className="text-base font-semibold text-gray-900">
                  R$ {item.price.toFixed(2).replace(".", ",")}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {cartItems.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-tints-french-blue">
              R$ {total.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            className="w-full bg-tints-french-blue text-white py-3 rounded font-medium hover:bg-tints-french-blue/90 transition-colors cursor-pointer"
          >
            Finalizar Pedido
          </button>

          <button
            onClick={handleContinueShopping}
            className="w-full bg-white text-gray-900 py-3 rounded font-medium border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Continuar Comprando
          </button>
        </div>
      )}
    </div>
  );
}