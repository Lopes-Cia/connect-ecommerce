import { create } from "zustand";

export type EcommerceState = Record<string, never>;

export const useEcommerceStore = create<EcommerceState>(() => ({}));

