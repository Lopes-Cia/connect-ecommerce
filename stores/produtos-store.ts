import { create } from "zustand";

import { ApiError } from "@/lib/api/client";
import {
  getBrands,
  getBrandById,
  getCategoriasTree,
  getCategoriaById,
  getCategoriaBySlug,
  getProdutoById,
  getProdutoBySlug,
  getProdutosByCategoria,
} from "@/lib/api/produtos";
import type { Brand, BrandByIdPayload, Categoria, CategoriaNode, Produto } from "@/lib/types/produtos";
import type { ProdutosByCategoriaResponse } from "@/lib/api/produtos";

type LoadStatus = "idle" | "loading" | "success" | "error";
type CategoriasTreeSource = "produtos" | "lopes";

type LopesCategoriasResponse = {
  success?: boolean;
  data?: CategoriaNode[];
  message?: string;
};

function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const data = error.data as { message?: unknown } | undefined;
    if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Erro inesperado";
}

function buildCategoriaKey(input: {
  idCategoria: number;
  includeDescendants?: 0 | 1;
  page?: number;
  pageSize?: number;
}): string {
  return [input.idCategoria, input.includeDescendants ?? 1, input.page ?? 1, input.pageSize ?? 24].join("|");
}

function buildBrandKey(input: { idBrand: number; page?: number; pageSize?: number }): string {
  return [input.idBrand, input.page ?? 1, input.pageSize ?? 24].join("|");
}

export type ProdutosState = {
  categoriasTree: CategoriaNode[] | null;
  categoriasTreeSource: CategoriasTreeSource | null;
  categoriasTreeStatus: LoadStatus;
  categoriasTreeError: string | null;
  loadCategoriasTree: (opts?: { force?: boolean; source?: CategoriasTreeSource }) => Promise<CategoriaNode[]>;
  live: () => Promise<string>;
  updateCategoriasJson: () => Promise<string>;
  updateHomeJson: () => Promise<string>;

  categoriaById: Record<number, { category: Categoria; children: Categoria[] } | undefined>;
  categoriaByIdStatus: Record<number, LoadStatus | undefined>;
  categoriaByIdError: Record<number, string | null | undefined>;
  loadCategoriaById: (input: { idCategoria: number; force?: boolean }) => Promise<{
    category: Categoria;
    children: Categoria[];
  }>;
  categoriaBySlug: Record<string, { category: CategoriaNode } | undefined>;
  categoriaBySlugStatus: Record<string, LoadStatus | undefined>;
  categoriaBySlugError: Record<string, string | null | undefined>;
  loadCategoriaBySlug: (input: { slug: string; force?: boolean }) => Promise<{
    category: CategoriaNode;
  }>;

  brands: Brand[] | null;
  brandsStatus: LoadStatus;
  brandsError: string | null;
  loadBrands: (opts?: { force?: boolean }) => Promise<Brand[]>;

  brandById: Record<number, Brand | undefined>;
  brandByIdPayload: Record<string, BrandByIdPayload | undefined>;
  brandByIdStatus: Record<string, LoadStatus | undefined>;
  brandByIdError: Record<string, string | null | undefined>;
  loadBrandById: (input: { idBrand: number; page?: number; pageSize?: number; force?: boolean }) => Promise<BrandByIdPayload>;

  produtosByCategoria: Record<string, ProdutosByCategoriaResponse | undefined>;
  produtosByCategoriaStatus: Record<string, LoadStatus | undefined>;
  produtosByCategoriaError: Record<string, string | null | undefined>;
  loadProdutosByCategoria: (input: {
    idCategoria: number;
    includeDescendants?: 0 | 1;
    page?: number;
    pageSize?: number;
    force?: boolean;
  }) => Promise<ProdutosByCategoriaResponse>;

  produtoById: Record<number, Produto | undefined>;
  produtoBySlug: Record<string, Produto | undefined>;
  produtoStatus: Record<string, LoadStatus | undefined>;
  produtoError: Record<string, string | null | undefined>;
  loadProdutoById: (input: { idProduto: number; force?: boolean }) => Promise<Produto>;
  loadProdutoBySlug: (input: { slug: string; force?: boolean }) => Promise<Produto>;

  reset: () => void;
};

const INITIAL: Pick<
  ProdutosState,
  | "categoriasTree"
  | "categoriasTreeSource"
  | "categoriasTreeStatus"
  | "categoriasTreeError"
  | "categoriaById"
  | "categoriaByIdStatus"
  | "categoriaByIdError"
  | "categoriaBySlug"
  | "categoriaBySlugStatus"
  | "categoriaBySlugError"
  | "brands"
  | "brandsStatus"
  | "brandsError"
  | "brandById"
  | "brandByIdPayload"
  | "brandByIdStatus"
  | "brandByIdError"
  | "produtosByCategoria"
  | "produtosByCategoriaStatus"
  | "produtosByCategoriaError"
  | "produtoById"
  | "produtoBySlug"
  | "produtoStatus"
  | "produtoError"
> = {
  categoriasTree: null,
  categoriasTreeSource: null,
  categoriasTreeStatus: "idle",
  categoriasTreeError: null,

  categoriaById: {},
  categoriaByIdStatus: {},
  categoriaByIdError: {},
  categoriaBySlug: {},
  categoriaBySlugStatus: {},
  categoriaBySlugError: {},

  brands: null,
  brandsStatus: "idle",
  brandsError: null,

  brandById: {},
  brandByIdPayload: {},
  brandByIdStatus: {},
  brandByIdError: {},

  produtosByCategoria: {},
  produtosByCategoriaStatus: {},
  produtosByCategoriaError: {},

  produtoById: {},
  produtoBySlug: {},
  produtoStatus: {},
  produtoError: {},
};

export const useProdutosStore = create<ProdutosState>((set, get) => ({
  ...INITIAL,

  loadCategoriasTree: async (opts) => {
    const source = opts?.source ?? "produtos";
    const { categoriasTree, categoriasTreeSource, categoriasTreeStatus } = get();
    if (!opts?.force && categoriasTree && categoriasTreeStatus === "success" && categoriasTreeSource === source) {
      return categoriasTree;
    }

    set({ categoriasTreeStatus: "loading", categoriasTreeError: null });
    try {
      const data = await getCategoriasTree();

      set({ categoriasTree: data, categoriasTreeSource: source, categoriasTreeStatus: "success" });
      return data;
    } catch (error) {
      const message = getApiErrorMessage(error);
      set({ categoriasTreeStatus: "error", categoriasTreeError: message });
      throw error;
    }
  },

  live: async () => {
    const response = await fetch("/api/lopes/categorias", { cache: "no-store" })
    return await response.text()
  },

  updateCategoriasJson: async () => {
    const response = await fetch("/api/dev/categorias/update-json", { method: "POST", cache: "no-store" })
    return await response.text()
  },

  updateHomeJson: async () => {
    const response = await fetch("/api/dev/home/update-json", { method: "POST", cache: "no-store" })
    return await response.text()
  },

  loadCategoriaById: async ({ idCategoria, force }) => {
    const cached = get().categoriaById[idCategoria];
    const status = get().categoriaByIdStatus[idCategoria];
    if (!force && cached && status === "success") return cached;

    set((state) => ({
      categoriaByIdStatus: { ...state.categoriaByIdStatus, [idCategoria]: "loading" },
      categoriaByIdError: { ...state.categoriaByIdError, [idCategoria]: null },
    }));

    try {
      const payload = await getCategoriaById(idCategoria);
      set((state) => ({
        categoriaById: { ...state.categoriaById, [idCategoria]: payload },
        categoriaByIdStatus: { ...state.categoriaByIdStatus, [idCategoria]: "success" },
      }));
      return payload;
    } catch (error) {
      const message = getApiErrorMessage(error);
      set((state) => ({
        categoriaByIdStatus: { ...state.categoriaByIdStatus, [idCategoria]: "error" },
        categoriaByIdError: { ...state.categoriaByIdError, [idCategoria]: message },
      }));
      throw error;
    }
  },

  loadCategoriaBySlug: async ({ slug, force }) => {
    const key = String(slug ?? "").trim().replace(/^\/+/, "");
    const cached = get().categoriaBySlug[key];
    const status = get().categoriaBySlugStatus[key];
    if (!force && cached && status === "success") return cached;

    set((state) => ({
      categoriaBySlugStatus: { ...state.categoriaBySlugStatus, [key]: "loading" },
      categoriaBySlugError: { ...state.categoriaBySlugError, [key]: null },
    }));

    try {
      const payload = await getCategoriaBySlug(key);
      set((state) => ({
        categoriaBySlug: { ...state.categoriaBySlug, [key]: payload },
        categoriaBySlugStatus: { ...state.categoriaBySlugStatus, [key]: "success" },
      }));
      return payload;
    } catch (error) {
      const message = getApiErrorMessage(error);
      set((state) => ({
        categoriaBySlugStatus: { ...state.categoriaBySlugStatus, [key]: "error" },
        categoriaBySlugError: { ...state.categoriaBySlugError, [key]: message },
      }));
      throw error;
    }
  },

  loadBrands: async (opts) => {
    const { brands, brandsStatus } = get();
    if (!opts?.force && brands && brandsStatus === "success") return brands;

    set({ brandsStatus: "loading", brandsError: null });
    try {
      const data = await getBrands();
      set({ brands: data, brandsStatus: "success" });
      return data;
    } catch (error) {
      const message = getApiErrorMessage(error);
      set({ brandsStatus: "error", brandsError: message });
      throw error;
    }
  },

  loadBrandById: async (input) => {
    const key = buildBrandKey(input);
    const cached = get().brandByIdPayload[key];
    const cachedStatus = get().brandByIdStatus[key];
    if (!input.force && cached && cachedStatus === "success") return cached;

    set((state) => ({
      brandByIdStatus: { ...state.brandByIdStatus, [key]: "loading" },
      brandByIdError: { ...state.brandByIdError, [key]: null },
    }));

    try {
      const payload = await getBrandById(input.idBrand, { page: input.page, pageSize: input.pageSize });
      set((state) => ({
        brandById: { ...state.brandById, [payload.brand.id]: payload.brand },
        brandByIdPayload: { ...state.brandByIdPayload, [key]: payload },
        brandByIdStatus: { ...state.brandByIdStatus, [key]: "success" },
      }));
      return payload;
    } catch (error) {
      const message = getApiErrorMessage(error);
      set((state) => ({
        brandByIdStatus: { ...state.brandByIdStatus, [key]: "error" },
        brandByIdError: { ...state.brandByIdError, [key]: message },
      }));
      throw error;
    }
  },

  loadProdutosByCategoria: async (input) => {
    const key = buildCategoriaKey(input);
    const cached = get().produtosByCategoria[key];
    const cachedStatus = get().produtosByCategoriaStatus[key];
    if (!input.force && cached && cachedStatus === "success") return cached;

    set((state) => ({
      produtosByCategoriaStatus: { ...state.produtosByCategoriaStatus, [key]: "loading" },
      produtosByCategoriaError: { ...state.produtosByCategoriaError, [key]: null },
    }));

    try {
      const data = await getProdutosByCategoria(input.idCategoria, {
        includeDescendants: input.includeDescendants,
        page: input.page,
        pageSize: input.pageSize,
      });
      set((state) => ({
        produtosByCategoria: { ...state.produtosByCategoria, [key]: data },
        produtosByCategoriaStatus: { ...state.produtosByCategoriaStatus, [key]: "success" },
      }));
      return data;
    } catch (error) {
      const message = getApiErrorMessage(error);
      set((state) => ({
        produtosByCategoriaStatus: { ...state.produtosByCategoriaStatus, [key]: "error" },
        produtosByCategoriaError: { ...state.produtosByCategoriaError, [key]: message },
      }));
      throw error;
    }
  },

  loadProdutoById: async ({ idProduto, force }) => {
    const cached = get().produtoById[idProduto];
    const status = get().produtoStatus[`id:${idProduto}`];
    if (!force && cached && status === "success") return cached;

    set((state) => ({
      produtoStatus: { ...state.produtoStatus, [`id:${idProduto}`]: "loading" },
      produtoError: { ...state.produtoError, [`id:${idProduto}`]: null },
    }));

    try {
      const data = await getProdutoById(idProduto);
      set((state) => ({
        produtoById: { ...state.produtoById, [idProduto]: data },
        produtoStatus: { ...state.produtoStatus, [`id:${idProduto}`]: "success" },
      }));
      return data;
    } catch (error) {
      const message = getApiErrorMessage(error);
      set((state) => ({
        produtoStatus: { ...state.produtoStatus, [`id:${idProduto}`]: "error" },
        produtoError: { ...state.produtoError, [`id:${idProduto}`]: message },
      }));
      throw error;
    }
  },

  loadProdutoBySlug: async ({ slug, force }) => {
    const key = String(slug ?? "").trim();
    const cached = get().produtoBySlug[key];
    const status = get().produtoStatus[`slug:${key}`];
    if (!force && cached && status === "success") return cached;

    set((state) => ({
      produtoStatus: { ...state.produtoStatus, [`slug:${key}`]: "loading" },
      produtoError: { ...state.produtoError, [`slug:${key}`]: null },
    }));

    try {
      const data = await getProdutoBySlug(key);
      set((state) => ({
        produtoBySlug: { ...state.produtoBySlug, [key]: data },
        produtoStatus: { ...state.produtoStatus, [`slug:${key}`]: "success" },
      }));
      return data;
    } catch (error) {
      const message = getApiErrorMessage(error);
      set((state) => ({
        produtoStatus: { ...state.produtoStatus, [`slug:${key}`]: "error" },
        produtoError: { ...state.produtoError, [`slug:${key}`]: message },
      }));
      throw error;
    }
  },

  reset: () => set({ ...INITIAL }),
}));
