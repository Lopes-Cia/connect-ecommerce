import { create } from "zustand";

export type ProdutosState = Record<string, never>;

export const useProdutosStore = create<ProdutosState>(() => ({}));

