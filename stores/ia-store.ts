import { create } from "zustand";

const AI_CHAT_ENABLED_STORAGE_KEY = "connect_ecommerce_ai_chat_enabled_v1";

function readAiChatEnabledFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(AI_CHAT_ENABLED_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(AI_CHAT_ENABLED_STORAGE_KEY, "1");
      return true;
    }
    return raw.trim() === "1";
  } catch {
    return false;
  }
}

function writeAiChatEnabledToStorage(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AI_CHAT_ENABLED_STORAGE_KEY, value ? "1" : "0");
  } catch {
  }
}

export type IaState = {
  aiChatEnabled: boolean;
  setAiChatEnabled: (value: boolean) => void;
  toggleAiChat: () => void;
  contratoRaw: unknown | null;
  contratoView: unknown | null;
  setContratoData: (input: { raw: unknown | null; view: unknown | null }) => void;
};

export const useIaStore = create<IaState>((set, get) => ({
  aiChatEnabled: readAiChatEnabledFromStorage(),
  contratoRaw: null,
  contratoView: null,

  setAiChatEnabled: (value) => {
    const next = Boolean(value);
    set({ aiChatEnabled: next });
    writeAiChatEnabledToStorage(next);
  },

  toggleAiChat: () => {
    const next = !get().aiChatEnabled;
    set({ aiChatEnabled: next });
    writeAiChatEnabledToStorage(next);
  },

  setContratoData: (input) => {
    set({
      contratoRaw: input?.raw ?? null,
      contratoView: input?.view ?? null,
    });
  },
}));
