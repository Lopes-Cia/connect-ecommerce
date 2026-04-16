import { create } from "zustand";

type LoadStatus = "idle" | "loading" | "success" | "error";

export type CheckoutFormData = {
  nome: string;
  email: string;
  telefone: string;
  endereco: {
    cep: string;
    rua: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  pagamento: {
    metodo: "pix" | "cartao" | "dinheiro";
  };
  observacoes: string;
};

export type PedidoDraft = {
  cliente: unknown;
  form: CheckoutFormData;
  itens: Array<{
    id: string;
    nome: string;
    categoria: string;
    imagemUrl: string;
    precoUnitario: number;
    quantidade: number;
    subtotal: number;
  }>;
  resumo: {
    totalItens: number;
    total: number;
  };
};

export type PedidosState = {
  checkoutStatus: LoadStatus;
  checkoutError: string | null;
  checkoutForm: CheckoutFormData;
  lastDraft: PedidoDraft | null;
  enderecoMode: "saved" | "new";
  selectedEnderecoIndex: number | null;
  setCheckoutField: (path: string, value: string) => void;
  hydrateCheckoutFromCliente: (input: unknown) => void;
  selectEnderecoFromCliente: (input: unknown, index: number) => void;
  setEnderecoMode: (mode: "saved" | "new") => void;
  resetCheckout: () => void;
  submitCheckout: (input: {
    clienteData: unknown;
    items: Array<{
      id: string;
      name: string;
      category: string;
      imageUrl: string;
      unitPrice: number;
      quantity: number;
    }>;
    totalItems: number;
    totalAmount: number;
  }) => Promise<PedidoDraft>;
};

const INITIAL_FORM: CheckoutFormData = {
  nome: "",
  email: "",
  telefone: "",
  endereco: {
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  },
  pagamento: {
    metodo: "pix",
  },
  observacoes: "",
};

const INITIAL: Pick<PedidosState, "checkoutStatus" | "checkoutError" | "checkoutForm" | "lastDraft"> = {
  checkoutStatus: "idle",
  checkoutError: null,
  checkoutForm: INITIAL_FORM,
  lastDraft: null,
};

function safeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return asRecord(first);
  }
  return asRecord(value);
}

function recordAt(value: unknown, index: number): Record<string, unknown> | null {
  if (!Array.isArray(value)) return null;
  const raw = value.at(index);
  return asRecord(raw);
}

function pickString(source: Record<string, unknown> | null, keys: string[]): string {
  if (!source) return "";
  for (const key of keys) {
    const raw = source[key];
    const value = safeString(raw).trim();
    if (value) return value;
  }
  return "";
}

function pickStringByKeyMatch(source: Record<string, unknown> | null, matcher: RegExp): string {
  if (!source) return "";
  for (const [key, raw] of Object.entries(source)) {
    if (!matcher.test(key)) continue;
    const value = safeString(raw).trim();
    if (value) return value;
  }
  return "";
}

function setPathValue<T extends Record<string, unknown>>(base: T, path: string, value: unknown): T {
  const parts = String(path).split(".").filter(Boolean);
  if (parts.length === 0) return base;

  const next: Record<string, unknown> = { ...base };
  let cursor: Record<string, unknown> = next;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    const existing = cursor[key];
    const created = typeof existing === "object" && existing !== null ? { ...(existing as object) } : {};
    cursor[key] = created;
    cursor = created as Record<string, unknown>;
  }

  cursor[parts[parts.length - 1]] = value;
  return next as T;
}

export const usePedidosStore = create<PedidosState>((set, get) => ({
  ...INITIAL,
  enderecoMode: "new",
  selectedEnderecoIndex: null,

  setCheckoutField: (path, value) => {
    set((state) => ({
      checkoutForm: setPathValue(state.checkoutForm as unknown as Record<string, unknown>, path, value) as CheckoutFormData,
    }));
  },

  setEnderecoMode: (mode) => set({ enderecoMode: mode }),

  hydrateCheckoutFromCliente: (input) => {
    const data = input as Record<string, unknown> | null;
    const cliente =
      asRecord(data?.cliente) ??
      asRecord(data?.clienteData) ??
      asRecord(data?.user) ??
      asRecord(data?.usuario) ??
      asRecord(data?.customer) ??
      null;

    const email =
      pickString(cliente, ["email", "e-mail", "mail"]) ||
      pickString(data, ["email", "e-mail", "mail"]) ||
      pickStringByKeyMatch(cliente, /email|e-?mail|mail/i) ||
      pickStringByKeyMatch(data, /email|e-?mail|mail/i);

    const nome =
      pickString(cliente, ["nome", "name", "fullName", "full_name", "razaoSocial", "razao_social"]) ||
      pickString(data, ["nome", "name", "fullName", "full_name", "razaoSocial", "razao_social"]) ||
      pickStringByKeyMatch(cliente, /nome|name|razao/i);

    const telefone =
      pickString(cliente, ["telefone", "phone", "celular", "whatsapp", "fone", "mobile"]) ||
      pickString(data, ["telefone", "phone", "celular", "whatsapp", "fone", "mobile"]) ||
      pickStringByKeyMatch(cliente, /tel|fone|phone|cel|whats/i);

    const endereco = firstRecord(data?.enderecos);
    const cep = pickString(endereco, ["cep", "CEP", "codigoPostal", "codigo_postal"]);
    const rua = pickString(endereco, ["rua", "logradouro", "endereco", "endereço"]);
    const numero = pickString(endereco, ["numero", "número", "num"]);
    const complemento = pickString(endereco, ["complemento", "comp", "referencia", "referência"]);
    const bairro = pickString(endereco, ["bairro"]);
    const cidade = pickString(endereco, ["cidade", "municipio", "município"]);
    const uf = pickString(endereco, ["uf", "estado"]);

    set((state) => ({
      checkoutForm: {
        ...state.checkoutForm,
        email: state.checkoutForm.email || email,
        nome: state.checkoutForm.nome || nome,
        telefone: state.checkoutForm.telefone || telefone,
        endereco: {
          ...state.checkoutForm.endereco,
          cep: state.checkoutForm.endereco.cep || cep,
          rua: state.checkoutForm.endereco.rua || rua,
          numero: state.checkoutForm.endereco.numero || numero,
          complemento: state.checkoutForm.endereco.complemento || complemento,
          bairro: state.checkoutForm.endereco.bairro || bairro,
          cidade: state.checkoutForm.endereco.cidade || cidade,
          uf: state.checkoutForm.endereco.uf || uf,
        },
      },
    }));

    const enderecos = Array.isArray(data?.enderecos) ? (data?.enderecos as unknown[]) : [];
    if (enderecos.length > 0) {
      set((state) => ({
        enderecoMode: state.enderecoMode === "new" ? "saved" : state.enderecoMode,
        selectedEnderecoIndex: state.selectedEnderecoIndex ?? 0,
      }));
    }
  },

  selectEnderecoFromCliente: (input, index) => {
    const data = input as Record<string, unknown> | null;
    const endereco = recordAt(data?.enderecos, index);
    if (!endereco) {
      set({ enderecoMode: "new", selectedEnderecoIndex: null });
      return;
    }

    const cep = pickString(endereco, ["cep", "CEP", "codigoPostal", "codigo_postal"]);
    const rua = pickString(endereco, ["rua", "logradouro", "endereco", "endereço"]);
    const numero = pickString(endereco, ["numero", "número", "num"]);
    const complemento = pickString(endereco, ["complemento", "comp", "referencia", "referência"]);
    const bairro = pickString(endereco, ["bairro"]);
    const cidade = pickString(endereco, ["cidade", "municipio", "município"]);
    const uf = pickString(endereco, ["uf", "estado"]);

    set((state) => ({
      enderecoMode: "saved",
      selectedEnderecoIndex: index,
      checkoutForm: {
        ...state.checkoutForm,
        endereco: {
          ...state.checkoutForm.endereco,
          cep,
          rua,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
        },
      },
    }));
  },

  resetCheckout: () => set({ ...INITIAL }),

  submitCheckout: async ({ clienteData, items, totalItems, totalAmount }) => {
    set({ checkoutStatus: "loading", checkoutError: null });
    try {
      const form = get().checkoutForm;

      if (!form.nome.trim()) {
        throw new Error("Informe o nome para continuar.");
      }
      if (!form.email.trim()) {
        throw new Error("Informe o e-mail para continuar.");
      }
      if (!form.telefone.trim()) {
        throw new Error("Informe o telefone para continuar.");
      }
      if (!form.endereco.cep.trim()) {
        throw new Error("Informe o CEP para continuar.");
      }
      if (!form.endereco.rua.trim()) {
        throw new Error("Informe a rua para continuar.");
      }
      if (!form.endereco.numero.trim()) {
        throw new Error("Informe o número para continuar.");
      }
      if (!form.endereco.bairro.trim()) {
        throw new Error("Informe o bairro para continuar.");
      }
      if (!form.endereco.cidade.trim()) {
        throw new Error("Informe a cidade para continuar.");
      }
      if (!form.endereco.uf.trim()) {
        throw new Error("Informe o UF para continuar.");
      }

      const draft: PedidoDraft = {
        cliente: clienteData,
        form,
        itens: items.map((item) => ({
          id: item.id,
          nome: item.name,
          categoria: item.category,
          imagemUrl: item.imageUrl,
          precoUnitario: item.unitPrice,
          quantidade: item.quantity,
          subtotal: item.unitPrice * item.quantity,
        })),
        resumo: {
          totalItens,
          total: totalAmount,
        },
      };

      set({ checkoutStatus: "success", lastDraft: draft });
      return draft;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao finalizar checkout.";
      set({ checkoutStatus: "error", checkoutError: message });
      throw error;
    }
  },
}));

