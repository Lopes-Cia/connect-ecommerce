import { create } from "zustand";

export type PedidosState = Record<string, never>;

export const usePedidosStore = create<PedidosState>(() => ({}));

