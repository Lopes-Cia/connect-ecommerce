"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { CardCompM1 } from "@/components/cards/cardCompM1";
import { CardCompM2 } from "@/components/cards/cardCompM2";
import { CardCompM2V2 } from "@/components/cards/cardCompM2.v2";

type CallResult = {
  url: string;
  method: string;
  status: number;
  ok: boolean;
  payload: unknown;
};

type ActionGroup = "raw" | "contract" | "catalog";

type ActionVariant = "primary" | "danger" | "neutral";

type Action = {
  label: string;
  url: string;
  init: RequestInit;
  group: ActionGroup;
  uses: string[];
  variant?: ActionVariant;
  enabled?: boolean;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function buildQueryString(params: Record<string, string>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const trimmed = value.trim();
    if (trimmed) usp.set(key, trimmed);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

function encodePathSegments(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function callApi(url: string, init: RequestInit): Promise<CallResult> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
    ...init,
  });

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  return {
    url,
    method: String(init.method ?? "GET").toUpperCase(),
    status: response.status,
    ok: response.ok,
    payload,
  };
}

export default function DevPage() {
  const [result, setResult] = useState<CallResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [clienteToken, setClienteToken] = useState<string>("");
  const [params, setParams] = useState({
    codigo: "1",
    codPai: "",
    categoria: "",
    idCatMarketplace: "",
    nomeCatMarketplace: "",
    categoriaSlugPath: "categoria/bebidas",
    email: "",
    whatsapp: "",
    idProduto: "",
    produtoSlug: "",
    includeDescendants: "1",
    page: "1",
    pageSize: "24",
    codProd: "",
    ean: "",
    productId: "",
    descricaoErp: "",
    skuId: "",
    cnpjCliente: "",
    idCategoria: "",
    catalogQ: "",
    catalogCategoryId: "",
    catalogBrandId: "",
    catalogInStock: "",
    catalogPriceMin: "",
    catalogPriceMax: "",
    catalogSort: "name:asc",
  });

  const actions = useMemo(
    () => {
      const idCategoriaPath = params.idCategoria.trim() || "1";
      const idProdutoPath = params.idProduto.trim() || "1";
      const categoriaSlugPath = encodePathSegments(params.categoriaSlugPath);
      const produtoSlugPath = encodeURIComponent(String(params.produtoSlug ?? "").trim() || "produto-1");

      return [
        { group: "raw", uses: [], label: "TokenService: gerar token", url: "/api/dev/tokenservice/generate", init: { method: "POST" as const } },
        { group: "raw", uses: [], label: "TokenService RAW: gerar token", url: "/api/dev/tokenservice/raw/generate", init: { method: "POST" as const } },

        {
          group: "contract",
          uses: ["codigo", "codPai", "categoria", "idCatMarketplace", "nomeCatMarketplace"],
          label: "LOPES (traduzido): categorias (back)",
          url:
            "/api/lopes/categorias" +
            buildQueryString({
              codigo: params.codigo,
              codPai: params.codPai,
              categoria: params.categoria,
              idCatMarketplace: params.idCatMarketplace,
              nomeCatMarketplace: params.nomeCatMarketplace,
            }),
          init: { method: "GET" as const },
        },
        {
          group: "contract",
          uses: [],
          label: "LOPES (traduzido): categorias (snapshot)",
          url: "/api/lopes/produtos/categorias",
          init: { method: "GET" as const },
        },
        {
          group: "contract",
          uses: ["categoriaSlugPath"],
          label: "LOPES (traduzido): categoria by-slug (snapshot)",
          url: `/api/lopes/produtos/categorias/by-slug/${categoriaSlugPath}`,
          init: { method: "GET" as const },
        },
        {
          group: "contract",
          uses: ["idCategoria", "includeDescendants", "page", "pageSize"],
          label: "LOPES (traduzido): produtos by-categoria",
          url:
            `/api/lopes/produtos/by-categoria/${encodeURIComponent(idCategoriaPath)}` +
            buildQueryString({
              includeDescendants: params.includeDescendants,
              page: params.page,
              pageSize: params.pageSize,
            }),
          init: { method: "GET" as const },
        },
        {
          group: "contract",
          uses: ["idProduto"],
          label: "LOPES (traduzido): produto by-id",
          url: `/api/lopes/produtos/by-id/${encodeURIComponent(idProdutoPath)}`,
          init: { method: "GET" as const },
        },
        {
          group: "contract",
          uses: ["produtoSlug"],
          label: "LOPES (traduzido): produto by-slug",
          url: `/api/lopes/produtos/by-slug/${produtoSlugPath}`,
          init: { method: "GET" as const },
        },
        {
          group: "contract",
          uses: ["codProd", "ean", "productId", "descricaoErp", "skuId", "cnpjCliente"],
          label: "LOPES (traduzido): produto-loja (query)",
          url:
            "/api/lopes/produto-loja" +
            buildQueryString({
              codProd: params.codProd,
              ean: params.ean,
              productId: params.productId,
              descricaoErp: params.descricaoErp,
              skuId: params.skuId,
              cnpjCliente: params.cnpjCliente,
            }),
          init: { method: "GET" as const },
        },

        {
          group: "catalog",
          uses: [],
          label: "CATALOG (redis): health",
          url: "/api/catalog/health",
          init: { method: "GET" as const },
          variant: "neutral",
        },
        {
          group: "catalog",
          uses: [],
          label: "CATALOG (redis): index (ensure)",
          url: "/api/dev/catalog/index",
          init: { method: "POST" as const },
          variant: "primary",
        },
        {
          group: "catalog",
          uses: [],
          label: "CATALOG (redis): index (drop+create)",
          url: "/api/dev/catalog/index?drop=1",
          init: { method: "POST" as const },
          variant: "danger",
        },
        {
          group: "catalog",
          uses: [],
          label: "CATALOG (redis): sync (all)",
          url: "/api/dev/catalog/sync",
          init: { method: "POST" as const },
          variant: "primary",
        },
        {
          group: "catalog",
          uses: [],
          label: "CATALOG (redis): sync (categorias)",
          url: "/api/dev/catalog/sync?only=categorias",
          init: { method: "POST" as const },
          variant: "primary",
        },
        {
          group: "catalog",
          uses: [],
          label: "CATALOG (redis): categorias (import local categorias.json)",
          url: "/api/dev/catalog/categories/import-local",
          init: { method: "POST" as const },
          variant: "primary",
        },
        {
          group: "catalog",
          uses: [],
          label: "CATALOG (redis): recategorizar produtos (local categorias.json)",
          url: "/api/dev/catalog/products/recategorize-local",
          init: { method: "POST" as const },
          variant: "danger",
        },
        {
          group: "catalog",
          uses: [],
          label: "CATALOG (redis): import home (colections.json)",
          url: "/api/dev/catalog/home/import",
          init: { method: "POST" as const },
          variant: "primary",
        },
        {
          group: "catalog",
          uses: [],
          label: "CATALOG (redis): clean (all)",
          url: "/api/dev/catalog/clean",
          init: { method: "POST" as const },
          variant: "danger",
        },
        {
          group: "catalog",
          uses: [],
          label: "CATALOG (redis): categories",
          url: "/api/catalog/categories",
          init: { method: "GET" as const },
          variant: "neutral",
        },
        {
          group: "catalog",
          uses: [],
          label: "CATALOG (redis): brands",
          url: "/api/catalog/brands",
          init: { method: "GET" as const },
          variant: "neutral",
        },
        {
          group: "catalog",
          uses: [
            "catalogQ",
            "catalogCategoryId",
            "catalogBrandId",
            "catalogInStock",
            "catalogPriceMin",
            "catalogPriceMax",
            "catalogSort",
            "page",
            "pageSize",
          ],
          label: "CATALOG (redis): products",
          url:
            "/api/catalog/products" +
            buildQueryString({
              q: params.catalogQ,
              categoryId: params.catalogCategoryId,
              brandId: params.catalogBrandId,
              inStock: params.catalogInStock,
              priceMin: params.catalogPriceMin,
              priceMax: params.catalogPriceMax,
              sort: params.catalogSort,
              page: params.page,
              pageSize: params.pageSize,
            }),
          init: { method: "GET" as const },
          variant: "neutral",
        },

        {
          group: "raw",
          uses: ["email", "whatsapp"],
          label: "RAW Clientes: enviarToken",
          url:
            "/api/dev/liz-refator/raw/usuarios/enviar-token" +
            buildQueryString({
              email: params.email,
              whatsapp: params.whatsapp,
            }),
          init: { method: "POST" as const },
        },
        {
          group: "raw",
          uses: [],
          label: "RAW Clientes: verificarToken",
          url:
            "/api/dev/liz-refator/raw/usuarios/verificar-token" +
            buildQueryString({
              token: clienteToken,
            }),
          init: { method: "POST" as const },
          enabled: Boolean(clienteToken),
        },
        {
          group: "raw",
          uses: ["codigo", "codPai", "categoria", "idCatMarketplace", "nomeCatMarketplace"],
          label: "RAW Produtos: getListCategoria",
          url:
            "/api/dev/liz-refator/raw/produtos/get-list-categoria" +
            buildQueryString({
              codigo: params.codigo,
              codPai: params.codPai,
              categoria: params.categoria,
              idCatMarketplace: params.idCatMarketplace,
              nomeCatMarketplace: params.nomeCatMarketplace,
            }),
          init: { method: "GET" as const },
        },
        {
          group: "raw",
          uses: ["codigo"],
          label: "RAW Produtos: getCategoria",
          url:
            "/api/dev/liz-refator/raw/produtos/get-categoria" +
            buildQueryString({
              codigo: params.codigo,
            }),
          init: { method: "GET" as const },
        },
        {
          group: "raw",
          uses: ["codProd", "ean", "productId", "descricaoErp", "skuId", "cnpjCliente"],
          label: "RAW Produtos: getProdutoLoja",
          url:
            "/api/dev/liz-refator/raw/produtos/get-produto-loja" +
            buildQueryString({
              codProd: params.codProd,
              ean: params.ean,
              productId: params.productId,
              descricaoErp: params.descricaoErp,
              skuId: params.skuId,
              cnpjCliente: params.cnpjCliente,
            }),
          init: { method: "GET" as const },
        },
        {
          group: "raw",
          uses: ["codProd", "ean", "productId", "descricaoErp", "skuId", "cnpjCliente", "idCategoria"],
          label: "RAW Produtos: getListProdutoLoja",
          url:
            "/api/dev/liz-refator/raw/produtos/get-list-produto-loja" +
            buildQueryString({
              codProd: params.codProd,
              ean: params.ean,
              productId: params.productId,
              descricaoErp: params.descricaoErp,
              skuId: params.skuId,
              cnpjCliente: params.cnpjCliente,
              idCategoria: params.idCategoria,
            }),
          init: { method: "GET" as const },
        },
      ] as Action[];
    },
    [clienteToken, params]
  );

  const backRequestPretty = useMemo(() => {
    const payload = asRecord(result?.payload);
    const request = payload ? payload.request : null;
    if (!request) return "—";
    try {
      return JSON.stringify(request, null, 2);
    } catch {
      return String(request);
    }
  }, [result]);

  const backResultPretty = useMemo(() => {
    const payload = asRecord(result?.payload);
    const data = payload && "data" in payload ? payload.data : result?.payload;
    if (!data) return "—";
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [result]);

  const pretty = useMemo(() => {
    if (!result) return "—";
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return String(result);
    }
  }, [result]);

  return (
    <div className="min-h-screen bg-linear-to-br from-custom-light-100 to-custom-light-300 px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="rounded-xl border border-custom-light-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-montserrat font-semibold text-custom-dark-1000">Dev — Motor de Testes</h1>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dev/clientes"
                className="h-9 inline-flex items-center rounded-md border border-custom-light-300 bg-white px-3 font-montserrat text-sm font-semibold text-custom-dark-1000 hover:bg-custom-light-100"
              >
                Clientes
              </Link>
              <Link
                href="/dev/registro"
                className="h-9 inline-flex items-center rounded-md border border-custom-light-300 bg-white px-3 font-montserrat text-sm font-semibold text-custom-dark-1000 hover:bg-custom-light-100"
              >
                Registro
              </Link>
            </div>
          </div>
          <p className="text-sm font-montserrat text-custom-dark-700">
            Endpoints para validar tokenService e chamadas do piloto.
          </p>
        </div>

        <div className="rounded-xl border border-custom-light-300 bg-white p-4 shadow-sm">
          <div className="text-xs font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700 mb-3">
            Componentes
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardCompM1
              imageUrl="/assets/banner-1.webp"
              imageAlt="Back to basics"
              title="Back to basics"
              description="Simple and versatile"
              href="/categorias"
              ctaLabel="Shop now"
            />
            <CardCompM2
              product={{
                id: "produto-1",
                name: "Nome",
                category: "Categoria",
                price: 149,
                image_url: "/assets/banner-2.webp",
                slug: "/produtos/produto-1",
              }}
              type="standard"
              colorLabel="Embalgem"
              sizeLabel="Valor"
              showOptionsAsText
              colorValueText="150 UN"
              sizeValueText="R$ 1543,00"
              colorOptions={["Lighter", "Darker"]}
              sizeOptions={["30", "32", "34"]}
              ctaLabel="Comprar"
              onAddToCart={() => null}
              onToggleFavorite={() => null}
            />
            <CardCompM2V2
              href="/produtos/produto-1"
              imageUrl="/assets/banner-3.webp"
              imageAlt="Produto"
              title="Lava-louças líquido Ypê Maça, frasco 500 ml, caixa com 24 unidades"
              priceLabel="R$ 1,94"
              priceSubLabel="por unidade"
              onAdd={() => null}
            />
          </div>
        </div>

        <div className="rounded-xl border border-custom-light-300 bg-white p-4 shadow-sm">
          <div className="text-xs font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700 mb-3">
            Parâmetros (Query)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">codigo</div>
              <input
                value={params.codigo}
                onChange={(e) => setParams((p) => ({ ...p, codigo: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: 1"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">codPai</div>
              <input
                value={params.codPai}
                onChange={(e) => setParams((p) => ({ ...p, codPai: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: 10"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">categoria</div>
              <input
                value={params.categoria}
                onChange={(e) => setParams((p) => ({ ...p, categoria: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: BEBIDAS"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">idCatMarketplace</div>
              <input
                value={params.idCatMarketplace}
                onChange={(e) => setParams((p) => ({ ...p, idCatMarketplace: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">nomeCatMarketplace</div>
              <input
                value={params.nomeCatMarketplace}
                onChange={(e) => setParams((p) => ({ ...p, nomeCatMarketplace: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">categoriaSlugPath</div>
              <input
                value={params.categoriaSlugPath}
                onChange={(e) => setParams((p) => ({ ...p, categoriaSlugPath: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: categoria/bebidas"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">email</div>
              <input
                value={params.email}
                onChange={(e) => setParams((p) => ({ ...p, email: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: user@dominio.com"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">whatsapp</div>
              <input
                value={params.whatsapp}
                onChange={(e) => setParams((p) => ({ ...p, whatsapp: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: 62999999999"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">idProduto</div>
              <input
                value={params.idProduto}
                onChange={(e) => setParams((p) => ({ ...p, idProduto: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: 123"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">produtoSlug</div>
              <input
                value={params.produtoSlug}
                onChange={(e) => setParams((p) => ({ ...p, produtoSlug: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: cerveja-xpto-123"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">includeDescendants</div>
              <input
                value={params.includeDescendants}
                onChange={(e) => setParams((p) => ({ ...p, includeDescendants: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="0 ou 1"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">page</div>
              <input
                value={params.page}
                onChange={(e) => setParams((p) => ({ ...p, page: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: 1"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">pageSize</div>
              <input
                value={params.pageSize}
                onChange={(e) => setParams((p) => ({ ...p, pageSize: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: 24"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">codProd</div>
              <input
                value={params.codProd}
                onChange={(e) => setParams((p) => ({ ...p, codProd: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: 123"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">ean</div>
              <input
                value={params.ean}
                onChange={(e) => setParams((p) => ({ ...p, ean: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: 7890000002998"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">productId</div>
              <input
                value={params.productId}
                onChange={(e) => setParams((p) => ({ ...p, productId: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">descricaoErp</div>
              <input
                value={params.descricaoErp}
                onChange={(e) => setParams((p) => ({ ...p, descricaoErp: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">skuId</div>
              <input
                value={params.skuId}
                onChange={(e) => setParams((p) => ({ ...p, skuId: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">cnpjCliente</div>
              <input
                value={params.cnpjCliente}
                onChange={(e) => setParams((p) => ({ ...p, cnpjCliente: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">idCategoria</div>
              <input
                value={params.idCategoria}
                onChange={(e) => setParams((p) => ({ ...p, idCategoria: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: 10"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() =>
                setParams({
                  codigo: "1",
                  codPai: "",
                  categoria: "",
                  idCatMarketplace: "",
                  nomeCatMarketplace: "",
                  categoriaSlugPath: "categoria/bebidas",
                  email: "",
                  whatsapp: "",
                  idProduto: "",
                  produtoSlug: "",
                  includeDescendants: "1",
                  page: "1",
                  pageSize: "24",
                  codProd: "",
                  ean: "",
                  productId: "",
                  descricaoErp: "",
                  skuId: "",
                  cnpjCliente: "",
                  idCategoria: "",
                  catalogQ: "",
                  catalogCategoryId: "",
                  catalogBrandId: "",
                  catalogInStock: "",
                  catalogPriceMin: "",
                  catalogPriceMax: "",
                  catalogSort: "name:asc",
                })
              }
              disabled={Boolean(loading)}
              className="h-10 px-3 rounded-md border border-custom-light-300 bg-white text-custom-dark-1000 font-montserrat text-sm font-semibold disabled:opacity-60"
            >
              Limpar parâmetros
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-custom-light-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={async () => {
                  setLoading(action.url);
                  try {
                    const res = await callApi(action.url, action.init);
                    if (action.url.startsWith("/api/dev/liz-refator/raw/usuarios/enviar-token")) {
                      const payload = res.payload as { data?: unknown } | null;
                      const nextToken = payload && typeof payload === "object" ? payload.data : null;
                      if (typeof nextToken === "string") setClienteToken(nextToken);
                    }
                    setResult(res);
                  } finally {
                    setLoading(null);
                  }
                }}
                disabled={Boolean(loading) || action.enabled === false}
                className={[
                  "min-h-10 px-3 py-2 rounded-md text-white font-montserrat text-sm font-semibold disabled:opacity-60 text-left transition-colors",
                  action.group === "raw"
                    ? "bg-tints-french-blue"
                    : action.group === "catalog"
                      ? action.variant === "danger"
                        ? "bg-red-600 hover:bg-red-700"
                        : action.variant === "primary"
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "bg-slate-600 hover:bg-slate-700"
                      : "bg-green-600",
                ].join(" ")}
              >
                <div className="leading-tight">
                  <div>{loading === action.url ? "Carregando..." : action.label}</div>
                  {action.uses.length > 0 ? (
                    <div className="text-[11px] font-medium opacity-90">
                      Params: {action.uses.join(", ")}
                    </div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-custom-light-300 bg-white p-4 shadow-sm">
          <div className="text-xs font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700 mb-2">
            Back Request
          </div>
          <pre className="text-xs overflow-auto bg-custom-light-100 rounded-md p-3">{backRequestPretty}</pre>
        </div>

        <div className="rounded-xl border border-custom-light-300 bg-white p-4 shadow-sm">
          <div className="text-xs font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700 mb-2">
            Back Result
          </div>
          <pre className="text-xs overflow-auto bg-custom-light-100 rounded-md p-3">{backResultPretty}</pre>
        </div>
      </div>
    </div>
  );
}
