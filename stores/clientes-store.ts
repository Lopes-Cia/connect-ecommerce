import { create } from "zustand";

export type ClientesState = Record<string, never>;

export const useClientesStore = create<ClientesState>(() => ({}));

