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
};

export const useControlStore = create<ControlState>(() => ({
  PRODUTOSSTORE: useProdutosStore,
  CLIENTESSTORE: useClientesStore,
  PEDIDOSSTORE: usePedidosStore,
  ECOMMERCESTORE: useEcommerceStore,
}));
