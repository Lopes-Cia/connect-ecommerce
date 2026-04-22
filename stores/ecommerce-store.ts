import { create } from "zustand";

import { ApiError } from "@/lib/api/client";
import { getHome } from "@/lib/api/ecommerce";
import type { HomeCollections } from "@/lib/types/ecommerce";

type LoadStatus = "idle" | "loading" | "success" | "error";

function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const data = error.data as { message?: unknown } | undefined;
    if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Erro inesperado";
}

export type EcommerceState = {
  home: HomeCollections | null;
  homeStatus: LoadStatus;
  homeError: string | null;
  loadHome: (opts?: { force?: boolean }) => Promise<HomeCollections>;
  reset: () => void;
};

const INITIAL: Pick<EcommerceState, "home" | "homeStatus" | "homeError"> = {
  home: null,
  homeStatus: "idle",
  homeError: null,
};

export const useEcommerceStore = create<EcommerceState>((set, get) => ({
  ...INITIAL,

  loadHome: async (opts) => {
    const { home, homeStatus } = get();
    if (!opts?.force && home && homeStatus === "success") return home;

    set({ homeStatus: "loading", homeError: null });
    try {
      const data = await getHome();
      set({ home: data, homeStatus: "success" });
      return data;
    } catch (error) {
      const message = getApiErrorMessage(error);
      set({ homeStatus: "error", homeError: message });
      throw error;
    }
  },

  reset: () => set({ ...INITIAL }),
}));

