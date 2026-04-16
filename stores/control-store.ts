import { create } from "zustand";

import { useClientesStore } from "./clientes-store";
import { useEcommerceStore } from "./ecommerce-store";
import { usePedidosStore } from "./pedidos-store";
import { useProdutosStore } from "./produtos-store";

export type ControlState = {
  PRODUTOSSTORE: typeof useProdutosStore;
  CLIENTESSTORE: typeof useClientesStore;
  PEDIDOSSTORE: typeof usePedidosStore;
  ECOMMERCESTORE: typeof useEcommerceStore;
  live: () => string;
};

export const useControlStore = create<ControlState>(() => ({
  PRODUTOSSTORE: useProdutosStore,
  CLIENTESSTORE: useClientesStore,
  PEDIDOSSTORE: usePedidosStore,
  ECOMMERCESTORE: useEcommerceStore,
  live: () => {
    fetch("/api/produtos/categorias", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("[next-bff] /api/produtos/categorias error", res.status, data);
          return;
        }
        console.log("[next-bff] /api/produtos/categorias", data);
      })
      .catch((err) => {
        console.error("[next-bff] /api/produtos/categorias network_error", err);
      });
    return "store live";
  },
}));
