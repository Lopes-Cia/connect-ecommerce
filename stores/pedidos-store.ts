import { create } from "zustand";

import { ApiError, apiClient } from "@/lib/api/client";
import { useCarrinhoStore, type CartItem } from "@/stores/carrinho-store";

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

export type PedidoDraft = Record<string, unknown>;

export type PedidoResumoUI = {
  pedidoId: number;
  checkoutId: number | null;
  createdAt: string | null;
  status: string;
  total: number;
  moeda: string;
  itensCount: number;
  itensQuantidade: number;
  pagamentoMetodo: string;
  pagamentoStatus: string;
  entregaCidade: string;
  entregaUf: string;
  freteNome: string;
  fretePrazoDias: number | null;
  fretePreco: number | null;
  raw: Record<string, unknown>;
};

export type PedidoItemUI = {
  itemId: number | null;
  produtoId: number | null;
  sku: string;
  slug: string;
  nome: string;
  imagemUrl: string;
  precoUnitario: number;
  quantidade: number;
  subtotal: number;
};

export type PedidoDetalheUI = PedidoResumoUI & {
  enderecoEntrega: Record<string, unknown> | null;
  pix: { copiaECola: string; expiresAt: string | null; qrCodeBase64: string | null } | null;
  itens: PedidoItemUI[];
};

export type PedidosState = {
  checkoutStatus: LoadStatus;
  checkoutError: string | null;
  checkoutForm: CheckoutFormData;
  lastDraft: PedidoDraft | null;
  pedidosStatus: LoadStatus;
  pedidosError: string | null;
  pedidos: PedidoResumoUI[];
  pedidosPage: number;
  pedidosPageSize: number;
  pedidosTotal: number;
  pedidosTotalPages: number;
  selectedPedidoStatus: LoadStatus;
  selectedPedidoError: string | null;
  selectedPedido: PedidoDetalheUI | null;
  enderecoMode: "saved" | "new";
  selectedEnderecoIndex: number | null;
  setCheckoutField: (path: string, value: string) => void;
  hydrateCheckoutFromLoginData: (input: unknown) => void;
  selectEnderecoFromLoginData: (input: unknown, index: number) => void;
  setEnderecoMode: (mode: "saved" | "new") => void;
  resetCheckout: () => void;
  loadPedidosByCliente: (input: { clienteId: number; page?: number; pageSize?: number }) => Promise<void>;
  loadPedidoById: (pedidoId: number) => Promise<void>;
  resetPedidosList: () => void;
  resetSelectedPedido: () => void;
  submitCheckout: (input: {
    loginData: unknown;
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

function unixTimestampMicros(): string {
  const micros = Math.floor(Date.now());
  return String(micros);
}

/*
Exemplo do JSON antigo usado para comparação manual durante os testes.
Não é usado pelo código em runtime.
*/
export const pedido_mockup_exemplo = {
  idIntegradora: 8,
  tipo: "OrderLopes",
  orderId: "009200417042026",
  payload: {
    orderId: "008200417042026",
    orderMarketplace: null,
    tipo: "OrderLopes",
    dateOrder: "2026-04-20 17:04:20",
    cliente: {
      nome: "COMERCIO DE BEBIDAS FICTICIO (TESTE)",
      fantasia: "BEBIDAS FICTICIO",
      CPFCNPJ: "25231575000146",
      inscRg: "258076992",
      email: "smbebidas91@gmail.com",
      bairro: "PACHECOS",
      CEP: "88135010",
      cidade: "PALHOCA",
      complemento: null,
      endereco: "RODOVIA BR-101",
      fone: "48988088888",
      numero: null,
      UF: "SC",
    },
    itens: [
      {
        codProd: 9,
        produto: "Cerveja Brahma Chopp Lata 473 ml",
        brinde: "N",
        qt: 5,
        valorUnitario: 14.99,
        desconto: 0,
        subTotal: 74.95,
      },
      {
        codProd: 94,
        produto: "Lava-roupas em pó Tixan Ypê Maciez, caixa com 9 unidades de 2,2 kg",
        brinde: "N",
        qt: 25,
        valorUnitario: 14.99,
        desconto: 0,
        subTotal: 374.75,
      },
    ],
    idTransp: 5,
    transportadora: "Transportadora retira",
    planoCodigo: "PIX",
    planoDescricao: "A VISTA",
    valor: 449.7,
    valorDesconto: 0,
    valorFrete: 0,
    valorTaxas: 0,
    posicao: "Aguardando Pagamento",
    pagamento: {
      codAutorizacao: null,
      nsu: null,
      dataPagamento: "2026-04-20 17:05:20",
      valorPago: 449.7,
    },
  },
  integrado: "N",
  cgc: "25231575000146", //CPFCNPJ
} as const;

export function buildPedidoItensFromCarrinho(items: CartItem[]) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];

  return list.map((item) => {
    const codProdCandidate = Number.parseInt(String(item.id ?? "").trim(), 10);
    const codProd = Number.isFinite(codProdCandidate) ? codProdCandidate : NaN;

    const produto = String(item.name ?? "").trim();

    const qtCandidate = Number(item.quantity);
    const qt = Number.isFinite(qtCandidate) && qtCandidate > 0 ? Math.floor(qtCandidate) : 0;

    const valorUnitarioCandidate = Number(item.unitPrice);
    const valorUnitario = Number.isFinite(valorUnitarioCandidate) ? valorUnitarioCandidate : 0;

    const subtotalCandidate = valorUnitario * qt;
    const subTotal = Number.isFinite(subtotalCandidate) ? Number(subtotalCandidate.toFixed(2)) : 0;

    return {
      codProd,
      produto,
      brinde: "N",
      qt,
      valorUnitario,
      desconto: 0,
      subTotal,
    };
  });
}

function sumPedidoItensTotal(itens: Array<{ subTotal?: unknown }>): number {
  const total = itens.reduce((acc, item) => {
    const value = Number((item as { subTotal?: unknown }).subTotal);
    if (!Number.isFinite(value)) return acc;
    return acc + value;
  }, 0);
  return Number.isFinite(total) ? Number(total.toFixed(2)) : 0;
}

type OrderLopesCliente = {
  nome: string;
  fantasia: string;
  CPFCNPJ: string;
  inscRg: string;
  email: string;
  bairro: string;
  CEP: string;
  cidade: string;
  complemento: string | null;
  endereco: string;
  fone: string;
  numero: string | null;
  UF: string;
};

function formatDateTime(value: Date): string {
  const d = value;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}:${pad2(d.getSeconds())}`;
}

export function buildPedidoMockupFromCarrinho(
  items: CartItem[],
  options?: { checkoutForm?: CheckoutFormData; loginData?: unknown }
) {
  const orderId = unixTimestampMicros();
  const itens = buildPedidoItensFromCarrinho(items);
  const itensValidos = itens.filter(
    (it) => Number.isFinite(Number((it as { codProd?: unknown }).codProd)) && Number((it as { qt?: unknown }).qt) > 0
  );
  if (itensValidos.length === 0) {
    throw new Error("Carrinho vazio. Adicione itens antes de finalizar.");
  }

  const dateOrder = formatDateTime(new Date());
  const total = sumPedidoItensTotal(itens);
  const cliente: OrderLopesCliente = {
    nome: "",
    fantasia: "",
    CPFCNPJ: "",
    inscRg: "",
    email: "",
    bairro: "",
    CEP: "",
    cidade: "",
    complemento: null,
    endereco: "",
    fone: "",
    numero: null,
    UF: "",
  };

  const loginObj =
    options?.loginData && typeof options.loginData === "object" && !Array.isArray(options.loginData)
      ? (options.loginData as Record<string, unknown>)
      : null;
  const meus =
    loginObj?.meus_dados && typeof loginObj.meus_dados === "object" && !Array.isArray(loginObj.meus_dados)
      ? (loginObj.meus_dados as Record<string, unknown>)
      : null;
  const cnpj = String(meus?.cnpjCliente ?? meus?.cgc ?? meus?.CPFCNPJ ?? loginObj?.cnpjCliente ?? "").trim();
  if (cnpj) {
    cliente.CPFCNPJ = cnpj;
  }

  const form = options?.checkoutForm;
  if (form) {
    const nome = String(form.nome ?? "").trim();
    const email = String(form.email ?? "").trim();
    const telefone = String(form.telefone ?? "").trim();
    const endereco = form.endereco ?? {
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
    };

    if (nome) {
      cliente.nome = nome;
      cliente.fantasia = nome;
    }
    if (email) cliente.email = email;
    if (telefone) cliente.fone = telefone;
    if (endereco.cep) cliente.CEP = String(endereco.cep).trim();
    if (endereco.rua) cliente.endereco = String(endereco.rua).trim();
    if (endereco.numero) cliente.numero = String(endereco.numero).trim();
    if (endereco.complemento) cliente.complemento = String(endereco.complemento).trim();
    if (endereco.bairro) cliente.bairro = String(endereco.bairro).trim();
    if (endereco.cidade) cliente.cidade = String(endereco.cidade).trim();
    if (endereco.uf) cliente.UF = String(endereco.uf).trim();
  }

  if (!cliente.CPFCNPJ) {
    throw new Error("Cliente sem CPFCNPJ/CNPJ. Faça login novamente.");
  }

  return {
    idIntegradora: 0,
    tipo: "OrderLopes",
    orderId,
    cgc: cliente.CPFCNPJ,
    payload: {
      orderId,
      orderMarketplace: null,
      tipo: "OrderLopes",
      dateOrder,
      cliente,
      itens: itensValidos,
      valor: total,
      valorDesconto: 0,
      valorFrete: 0,
      valorTaxas: 0,
      idTransp: 5,
      transportadora: "Transportadora retira",
      planoCodigo: "PIX",
      planoDescricao: "A VISTA",
      posicao: "Aguardando Pagamento",
      pagamento: {
        codAutorizacao: null,
        nsu: null,
        dataPagamento: dateOrder,
        valorPago: total,
      },
    },
    integrado: "N",
  };
}

export function getPedidoMockupFromCarrinho() {
  const carrinhoItems = useCarrinhoStore.getState().items;
  return buildPedidoMockupFromCarrinho(carrinhoItems);
}

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

const INITIAL_PEDIDOS: Pick<
  PedidosState,
  | "pedidosStatus"
  | "pedidosError"
  | "pedidos"
  | "pedidosPage"
  | "pedidosPageSize"
  | "pedidosTotal"
  | "pedidosTotalPages"
  | "selectedPedidoStatus"
  | "selectedPedidoError"
  | "selectedPedido"
> = {
  pedidosStatus: "idle",
  pedidosError: null,
  pedidos: [],
  pedidosPage: 1,
  pedidosPageSize: 20,
  pedidosTotal: 0,
  pedidosTotalPages: 1,
  selectedPedidoStatus: "idle",
  selectedPedidoError: null,
  selectedPedido: null,
};

function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const data = error.data as { message?: unknown; error?: unknown } | undefined;
    if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
    if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Erro inesperado";
}

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

function parseClienteId(loginData: unknown): number | null {
  const root = asRecord(loginData);
  const meusDados = asRecord(root?.meus_dados);
  const id = Number.parseInt(String(meusDados?.id ?? "").trim(), 10);
  return Number.isFinite(id) ? id : null;
}

function parseCheckoutId(payload: unknown): number | null {
  const data = asRecord(payload);
  const id = Number.parseInt(String(data?.checkoutId ?? "").trim(), 10);
  return Number.isFinite(id) ? id : null;
}

function parsePedidoId(payload: unknown): number | null {
  const data = asRecord(payload);
  const id = Number.parseInt(String(data?.pedidoId ?? "").trim(), 10);
  return Number.isFinite(id) ? id : null;
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function safeInt(value: unknown): number | null {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function safeIsoDate(value: unknown): string | null {
  const raw = safeString(value).trim();
  if (!raw) return null;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function sumQuantidade(itens: unknown[]): number {
  let total = 0;
  for (const raw of itens) {
    const item = asRecord(raw);
    total += safeNumber(item?.quantidade, 0);
  }
  return total;
}

function mapPedidoItemUI(value: unknown): PedidoItemUI {
  const item = asRecord(value) ?? {};
  const quantidade = Math.max(0, Math.floor(safeNumber(item.quantidade, 0)));
  const precoUnitario = safeNumber(item.precoUnitario, 0);
  const subtotal = safeNumber(item.subtotal, precoUnitario * quantidade);
  return {
    itemId: safeInt(item.itemId),
    produtoId: safeInt(item.produtoId),
    sku: safeString(item.sku).trim(),
    slug: safeString(item.slug).trim(),
    nome: safeString(item.nome).trim(),
    imagemUrl: safeString(item.imagemUrl).trim(),
    precoUnitario,
    quantidade,
    subtotal,
  };
}

function mapPedidoResumoUI(value: unknown): PedidoResumoUI {
  const pedido = asRecord(value) ?? {};
  const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
  const resumo = asRecord(pedido.resumo);
  const entrega = asRecord(pedido.entrega);
  const endereco = asRecord(entrega?.endereco);
  const freteSelecionado = asRecord(entrega?.freteSelecionado);
  const pagamento = asRecord(pedido.pagamento);

  const pedidoId = safeInt(pedido.pedidoId) ?? 0;
  const checkoutId = safeInt(pedido.checkoutId);
  const createdAt = safeIsoDate(pedido.createdAt);
  const status = safeString(pedido.status).trim() || "desconhecido";
  const total = safeNumber(resumo?.total, 0);
  const moeda = safeString(resumo?.moeda).trim() || "BRL";
  const itensCount = itens.length;
  const itensQuantidade = sumQuantidade(itens);
  const pagamentoMetodo = safeString(pagamento?.metodo).trim() || "desconhecido";
  const pagamentoStatus = safeString(pagamento?.status).trim() || "desconhecido";
  const entregaCidade = safeString(endereco?.cidade).trim();
  const entregaUf = safeString(endereco?.uf).trim();
  const freteNome = safeString(freteSelecionado?.nome ?? freteSelecionado?.codigo).trim();
  const fretePrazoDias = safeInt(freteSelecionado?.prazoDias);
  const fretePreco = Number.isFinite(Number(freteSelecionado?.preco)) ? safeNumber(freteSelecionado?.preco, 0) : null;

  return {
    pedidoId,
    checkoutId,
    createdAt,
    status,
    total,
    moeda,
    itensCount,
    itensQuantidade,
    pagamentoMetodo,
    pagamentoStatus,
    entregaCidade,
    entregaUf,
    freteNome,
    fretePrazoDias,
    fretePreco,
    raw: pedido,
  };
}

function mapPedidoDetalheUI(value: unknown): PedidoDetalheUI {
  const pedido = asRecord(value) ?? {};
  const resumo = mapPedidoResumoUI(pedido);
  const entrega = asRecord(pedido.entrega);
  const enderecoEntrega = asRecord(entrega?.endereco);
  const pagamento = asRecord(pedido.pagamento);
  const pix = asRecord(pagamento?.pix);
  const itensRaw = Array.isArray(pedido.itens) ? pedido.itens : [];
  const itens = itensRaw.map(mapPedidoItemUI);

  const copiaECola = safeString(pix?.copiaECola).trim();
  const expiresAt = safeIsoDate(pix?.expiresAt);
  const qrCodeBase64 = safeString(pix?.qrCodeBase64).trim() || null;

  return {
    ...resumo,
    enderecoEntrega,
    pix: copiaECola ? { copiaECola, expiresAt, qrCodeBase64 } : null,
    itens,
  };
}

export const usePedidosStore = create<PedidosState>((set, get) => ({
  ...INITIAL,
  ...INITIAL_PEDIDOS,
  enderecoMode: "new",
  selectedEnderecoIndex: null,

  setCheckoutField: (path, value) => {
    set((state) => ({
      checkoutForm: setPathValue(state.checkoutForm as unknown as Record<string, unknown>, path, value) as CheckoutFormData,
    }));
  },

  setEnderecoMode: (mode) => set({ enderecoMode: mode }),

  hydrateCheckoutFromLoginData: (input) => {
    const data = input as Record<string, unknown> | null;
    const meusDados = asRecord(data?.meus_dados);

    const email =
      pickString(meusDados, ["email", "e-mail", "mail"]) ||
      pickString(data, ["email", "e-mail", "mail"]) ||
      pickStringByKeyMatch(meusDados, /email|e-?mail|mail/i) ||
      pickStringByKeyMatch(data, /email|e-?mail|mail/i);

    const nome =
      pickString(meusDados, ["nome", "name", "fullName", "full_name", "razaoSocial", "razao_social"]) ||
      pickString(data, ["nome", "name", "fullName", "full_name", "razaoSocial", "razao_social"]) ||
      pickStringByKeyMatch(meusDados, /nome|name|razao/i);

    const telefone =
      pickString(meusDados, ["telefone", "phone", "celular", "whatsapp", "fone", "mobile"]) ||
      pickString(data, ["telefone", "phone", "celular", "whatsapp", "fone", "mobile"]) ||
      pickStringByKeyMatch(meusDados, /tel|fone|phone|cel|whats/i);

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

  selectEnderecoFromLoginData: (input, index) => {
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

  resetPedidosList: () =>
    set({
      pedidosStatus: "idle",
      pedidosError: null,
      pedidos: [],
      pedidosPage: 1,
      pedidosPageSize: 20,
      pedidosTotal: 0,
      pedidosTotalPages: 1,
    }),

  resetSelectedPedido: () =>
    set({
      selectedPedidoStatus: "idle",
      selectedPedidoError: null,
      selectedPedido: null,
    }),

  loadPedidosByCliente: async ({ clienteId, page, pageSize }) => {
    const safeClienteId = Number.parseInt(String(clienteId ?? "").trim(), 10);
    if (!Number.isFinite(safeClienteId)) {
      set({ pedidosStatus: "error", pedidosError: "clienteId inválido." });
      return;
    }

    const safePage = Number.isFinite(Number(page)) ? Math.max(1, Math.floor(Number(page))) : 1;
    const safePageSize = Number.isFinite(Number(pageSize)) ? Math.max(1, Math.floor(Number(pageSize))) : 20;

    set({ pedidosStatus: "loading", pedidosError: null });
    try {
      const payload = await apiClient<unknown>(
        `pedidos?clienteId=${encodeURIComponent(String(safeClienteId))}&page=${encodeURIComponent(
          String(safePage)
        )}&pageSize=${encodeURIComponent(String(safePageSize))}`,
        { method: "GET" }
      );

      const obj = asRecord(payload) ?? {};
      const data = Array.isArray(obj.data) ? (obj.data as unknown[]) : [];
      const mapped = data.map(mapPedidoResumoUI).filter((x) => Number.isFinite(x.pedidoId) && x.pedidoId > 0);

      set({
        pedidosStatus: "success",
        pedidosError: null,
        pedidos: mapped,
        pedidosPage: Math.max(1, Math.floor(safeNumber(obj.page, safePage))),
        pedidosPageSize: Math.max(1, Math.floor(safeNumber(obj.pageSize, safePageSize))),
        pedidosTotal: Math.max(0, Math.floor(safeNumber(obj.total, mapped.length))),
        pedidosTotalPages: Math.max(1, Math.floor(safeNumber(obj.totalPages, 1))),
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      set({ pedidosStatus: "error", pedidosError: message });
    }
  },

  loadPedidoById: async (pedidoId) => {
    const safePedidoId = Number.parseInt(String(pedidoId ?? "").trim(), 10);
    if (!Number.isFinite(safePedidoId)) {
      set({ selectedPedidoStatus: "error", selectedPedidoError: "pedidoId inválido.", selectedPedido: null });
      return;
    }

    set({ selectedPedidoStatus: "loading", selectedPedidoError: null, selectedPedido: null });
    try {
      const payload = await apiClient<unknown>(`pedidos/${encodeURIComponent(String(safePedidoId))}`, { method: "GET" });
      const obj = asRecord(payload) ?? {};
      const detalhe = mapPedidoDetalheUI(obj.data ?? obj);
      set({ selectedPedidoStatus: "success", selectedPedidoError: null, selectedPedido: detalhe });
    } catch (error) {
      const message = getApiErrorMessage(error);
      set({ selectedPedidoStatus: "error", selectedPedidoError: message, selectedPedido: null });
    }
  },

  resetCheckout: () => set({ ...INITIAL }),

  submitCheckout: async ({ loginData, items }) => {
    set({ checkoutStatus: "loading", checkoutError: null });
    try {
      const form = get().checkoutForm;
      const clienteId = parseClienteId(loginData);
      if (!clienteId) {
        throw new Error("Cliente nao identificado. Faça login novamente.");
      }

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

      // 1) Carrinho: se o app já está em modo server, o carrinho do servidor já é a fonte de verdade.
      // Caso ainda esteja em modo anonymous, sincroniza (wipe & recreate) apenas neste momento.
      const carrinhoMode = useCarrinhoStore.getState().mode;
      if (carrinhoMode !== "server") {
        const carrinhoAtual = await apiClient<{ success: true; data: unknown }>(`carrinho/${clienteId}`, {
          method: "GET",
        });
        const carrinhoData = asRecord(carrinhoAtual?.data);
        const itensServidor = Array.isArray(carrinhoData?.itens) ? carrinhoData.itens : [];
        for (const rawItem of itensServidor) {
          const serverItem = asRecord(rawItem);
          const serverItemId = Number.parseInt(String(serverItem?.itemId ?? "").trim(), 10);
          if (!Number.isFinite(serverItemId)) continue;
          await apiClient<{ success: true; data: unknown }>(`carrinho/itens/${serverItemId}`, {
            method: "DELETE",
            body: JSON.stringify({ clienteId }),
          });
        }

        for (const item of items) {
          const produtoId = Number.parseInt(String(item.id ?? "").trim(), 10);
          if (!Number.isFinite(produtoId)) {
            throw new Error(`Item do carrinho sem produtoId numerico: ${item.id}`);
          }
          await apiClient<{ success: true; data: unknown }>("carrinho/itens", {
            method: "POST",
            body: JSON.stringify({
              clienteId,
              item: {
                produtoId,
                quantidade: item.quantity,
              },
            }),
          });
        }

        await useCarrinhoStore.getState().switchToServerIfLoggedIn();
      }

      // 2) Cria sessao de checkout.
      const sessao = await apiClient<{ success: true; data: unknown }>("checkout/sessoes", {
        method: "POST",
        body: JSON.stringify({
          clienteId,
          contato: {
            nome: form.nome,
            email: form.email,
            telefone: form.telefone,
          },
          enderecoEntrega: {
            cep: form.endereco.cep,
            logradouro: form.endereco.rua,
            numero: form.endereco.numero,
            complemento: form.endereco.complemento,
            bairro: form.endereco.bairro,
            cidade: form.endereco.cidade,
            uf: form.endereco.uf,
            pais: "BR",
            referencia: form.observacoes || undefined,
          },
        }),
      });

      const checkoutId = parseCheckoutId(sessao?.data);
      if (!checkoutId) throw new Error("Falha ao criar sessao de checkout.");

      // 3) Busca fretes e seleciona a primeira opcao.
      const freteOpcoes = await apiClient<{ success: true; data: unknown }>(
        `checkout/sessoes/${checkoutId}/entrega/frete/opcoes?cep=${encodeURIComponent(form.endereco.cep)}`,
        { method: "GET" }
      );
      const freteData = asRecord(freteOpcoes?.data);
      const opcoes = Array.isArray(freteData?.opcoes) ? freteData.opcoes : [];
      const primeiraOpcao = asRecord(opcoes[0]);
      const codigoFrete = String(primeiraOpcao?.codigo ?? "").trim();
      if (!codigoFrete) throw new Error("Nao foi possivel selecionar frete para o checkout.");

      await apiClient<{ success: true; data: unknown }>(`checkout/sessoes/${checkoutId}/entrega/frete`, {
        method: "PUT",
        body: JSON.stringify({ codigo: codigoFrete }),
      });

      // 4) Gera e confirma pix mock.
      await apiClient<{ success: true; data: unknown }>(`checkout/sessoes/${checkoutId}/pagamento/pix`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await apiClient<{ success: true; data: unknown }>(
        `checkout/sessoes/${checkoutId}/pagamento/pix/confirmar`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      // 5) Finaliza checkout e carrega pedido final.
      const finalizacao = await apiClient<{ success: true; data: unknown }>(
        `checkout/sessoes/${checkoutId}/finalizar`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const pedidoId = parsePedidoId(finalizacao?.data);
      if (!pedidoId) throw new Error("Checkout finalizado sem pedidoId.");

      const pedido = await apiClient<{ success: true; data: unknown }>(`pedidos/${pedidoId}`, {
        method: "GET",
      });

      const draft = asRecord(pedido?.data) ?? {};
      set({ checkoutStatus: "success", lastDraft: draft });

      const nextMode = useCarrinhoStore.getState().mode;
      if (nextMode === "server") {
        await useCarrinhoStore.getState().refreshFromServer();
      } else {
        await useCarrinhoStore.getState().clearCart();
      }

      return draft;
    } catch (error) {
      const message = getApiErrorMessage(error);
      set({ checkoutStatus: "error", checkoutError: message });
      throw new Error(message);
    }
  },
}));
