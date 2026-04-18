"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useClientesStore } from "@/stores/clientes-store";
import { useControlStore } from "@/stores/control-store";
import { useProdutosStore } from "@/stores/produtos-store";

type RouteResult = {
  url: string;
  method: string;
  status: number;
  ok: boolean;
  payload: unknown;
};

function encodeSlugPath(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export default function DevPage() {
  const live = useControlStore((s) => s.live);
  const loginCliente = useClientesStore((s) => s.login);
  const produtosLive = useProdutosStore((s) => s.live);
  const didRun = useRef(false);
  const [idCategoria, setIdCategoria] = useState("10");
  const [categoriaSlug, setCategoriaSlug] = useState("/categoria/bebidas");
  const [idProduto, setIdProduto] = useState("1001");
  const [codProd, setCodProd] = useState("1001");
  const [idIntegradora, setIdIntegradora] = useState("1");
  const [slug, setSlug] = useState("/produtos/heineken-lata-269ml");
  const [idBrand, setIdBrand] = useState("871013969");
  const [clienteEmail, setClienteEmail] = useState("teste@exemplo.com");
  const [clienteSenha, setClienteSenha] = useState("123456");
  const [lastResult, setLastResult] = useState<RouteResult | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [lopesResult, setLopesResult] = useState<RouteResult | null>(null);
  const [lopesCategoriaCodigo, setLopesCategoriaCodigo] = useState("1");
  const [lopesListCategoriaCodigo, setLopesListCategoriaCodigo] = useState("");
  const [lopesListCategoriaCodPai, setLopesListCategoriaCodPai] = useState("");
  const [lopesListCategoriaCategoria, setLopesListCategoriaCategoria] = useState("");
  const [lopesListCategoriaIdCatMarketplace, setLopesListCategoriaIdCatMarketplace] = useState("");
  const [lopesListCategoriaNomeCatMarketplace, setLopesListCategoriaNomeCatMarketplace] = useState("");
  const [lopesProdutoLojaCodProd, setLopesProdutoLojaCodProd] = useState("8");
  const [lopesProdutoLojaEan, setLopesProdutoLojaEan] = useState("");
  const [lopesProdutoLojaProductId, setLopesProdutoLojaProductId] = useState("");
  const [lopesProdutoLojaDescricaoErp, setLopesProdutoLojaDescricaoErp] = useState("");
  const [lopesProdutoLojaSkuId, setLopesProdutoLojaSkuId] = useState("");
  const [lopesProdutoLojaCnpjCliente, setLopesProdutoLojaCnpjCliente] = useState("");
  const [lopesListProdutoLojaCodProd, setLopesListProdutoLojaCodProd] = useState("");
  const [lopesListProdutoLojaEan, setLopesListProdutoLojaEan] = useState("");
  const [lopesListProdutoLojaProductId, setLopesListProdutoLojaProductId] = useState("");
  const [lopesListProdutoLojaDescricaoErp, setLopesListProdutoLojaDescricaoErp] = useState("");
  const [lopesListProdutoLojaSkuId, setLopesListProdutoLojaSkuId] = useState("");
  const [lopesListProdutoLojaCnpjCliente, setLopesListProdutoLojaCnpjCliente] = useState("");
  const [lopesListProdutoLojaIdCategoria, setLopesListProdutoLojaIdCategoria] = useState("");
  const [produtosStoreLiveResult, setProdutosStoreLiveResult] = useState<string | null>(null);
  const produtosStoreLivePretty = useMemo(() => {
    if (!produtosStoreLiveResult) return null;
    const raw = String(produtosStoreLiveResult);
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }, [produtosStoreLiveResult]);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    console.log("[dev] live()", live());
  }, [live]);

  async function callProdutosStoreLive() {
    const result = await produtosLive();
    setProdutosStoreLiveResult(result);
    console.log("[dev] produtos-store live()", result);
  }

  const routes = useMemo(
    () => [
      { label: "Categorias (tree)", url: "/api/produtos/categorias" },
      { label: "Categoria por ID", url: `/api/produtos/categorias/${idCategoria}` },
      {
        label: "Categoria por Slug",
        url: `/api/produtos/categorias/by-slug/${encodeSlugPath(categoriaSlug)}`,
      },
      {
        label: "Produtos por Categoria",
        url: `/api/produtos/by-categoria/${idCategoria}?includeDescendants=1&page=1&pageSize=24`,
      },
      { label: "Produto por ID", url: `/api/produtos/by-id/${idProduto}` },
      { label: "Produto por Slug", url: `/api/produtos/by-slug/${encodeURIComponent(slug)}` },
      { label: "Brands", url: "/api/produtos/brands" },
      { label: "Brand por ID", url: `/api/produtos/brands/${idBrand}?page=1&pageSize=24` },
      { label: "Home", url: "/api/ecommerce/home" },
      { label: "Products (lista)", url: `/api/products?idIntegradora=${idIntegradora}` },
      { label: "Products por CodProd", url: `/api/products/${codProd}?idIntegradora=${idIntegradora}` },
      { label: "Auth Me", url: "/api/auth/me" },
    ],
    [idCategoria, categoriaSlug, idProduto, codProd, idIntegradora, slug, idBrand]
  );

  async function readPayloadFrom(response: Response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  async function callRoute(url: string, init?: RequestInit) {
    setLoadingUrl(url);
    try {
      const response = await fetch(url, { cache: "no-store", ...(init ?? {}) });
      const payload = await readPayloadFrom(response);
      const result: RouteResult = {
        url,
        method: String(init?.method ?? "GET").toUpperCase(),
        status: response.status,
        ok: response.ok,
        payload,
      };
      setLastResult(result);
      console.log("[dev-route]", result);
    } catch (error) {
      const result: RouteResult = {
        url,
        method: String(init?.method ?? "GET").toUpperCase(),
        status: 0,
        ok: false,
        payload: { message: error instanceof Error ? error.message : String(error) },
      };
      setLastResult(result);
      console.error("[dev-route]", result);
    } finally {
      setLoadingUrl(null);
    }
  }

  async function callClientesLogin() {
    const url = "/api/clientes/login";
    setLoadingUrl(url);
    try {
      const data = await loginCliente({ email: clienteEmail, senha: clienteSenha });
      const result: RouteResult = {
        url,
        method: "POST",
        status: 200,
        ok: true,
        payload: { success: true, data },
      };
      setLastResult(result);
      console.log("[dev-route]", result);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      const payload =
        error instanceof ApiError
          ? error.data ?? { message: error.message }
          : { message: error instanceof Error ? error.message : String(error) };
      const result: RouteResult = {
        url,
        method: "POST",
        status,
        ok: false,
        payload,
      };
      setLastResult(result);
      console.error("[dev-route]", result);
    } finally {
      setLoadingUrl(null);
    }
  }

  async function callLopesListCategorias() {
    const params = new URLSearchParams();
    if (lopesListCategoriaCodigo) params.set("codigo", lopesListCategoriaCodigo);
    if (lopesListCategoriaCodPai) params.set("codPai", lopesListCategoriaCodPai);
    if (lopesListCategoriaCategoria) params.set("categoria", lopesListCategoriaCategoria);
    if (lopesListCategoriaIdCatMarketplace) params.set("idCatMarketplace", lopesListCategoriaIdCatMarketplace);
    if (lopesListCategoriaNomeCatMarketplace)
      params.set("nomeCatMarketplace", lopesListCategoriaNomeCatMarketplace);
    const qs = params.toString();
    const url = qs ? `/api/lopes/categorias?${qs}` : "/api/lopes/categorias";
    setLoadingUrl(url);
    try {
      const response = await fetch(url, { cache: "no-store" });
      const payload = await readPayloadFrom(response);
      setLopesResult({ url, method: "GET", status: response.status, ok: response.ok, payload });
    } catch (error) {
      setLopesResult({
        url,
        method: "GET",
        status: 0,
        ok: false,
        payload: { message: error instanceof Error ? error.message : String(error) },
      });
    } finally {
      setLoadingUrl(null);
    }
  }

  async function callLopesCategoria() {
    const url = `/api/lopes/categoria?codigo=${encodeURIComponent(lopesCategoriaCodigo)}`;
    setLoadingUrl(url);
    try {
      const response = await fetch(url, { cache: "no-store" });
      const payload = await readPayloadFrom(response);
      setLopesResult({ url, method: "GET", status: response.status, ok: response.ok, payload });
    } catch (error) {
      setLopesResult({
        url,
        method: "GET",
        status: 0,
        ok: false,
        payload: { message: error instanceof Error ? error.message : String(error) },
      });
    } finally {
      setLoadingUrl(null);
    }
  }

  async function callLopesProdutoLoja() {
    const params = new URLSearchParams();
    if (lopesProdutoLojaCodProd) params.set("codProd", lopesProdutoLojaCodProd);
    if (lopesProdutoLojaEan) params.set("ean", lopesProdutoLojaEan);
    if (lopesProdutoLojaProductId) params.set("productId", lopesProdutoLojaProductId);
    if (lopesProdutoLojaDescricaoErp) params.set("descricaoErp", lopesProdutoLojaDescricaoErp);
    if (lopesProdutoLojaSkuId) params.set("skuId", lopesProdutoLojaSkuId);
    if (lopesProdutoLojaCnpjCliente) params.set("cnpjCliente", lopesProdutoLojaCnpjCliente);
    const qs = params.toString();
    const url = qs ? `/api/lopes/produto-loja?${qs}` : "/api/lopes/produto-loja";
    setLoadingUrl(url);
    try {
      const response = await fetch(url, { cache: "no-store" });
      const payload = await readPayloadFrom(response);
      setLopesResult({ url, method: "GET", status: response.status, ok: response.ok, payload });
    } catch (error) {
      setLopesResult({
        url,
        method: "GET",
        status: 0,
        ok: false,
        payload: { message: error instanceof Error ? error.message : String(error) },
      });
    } finally {
      setLoadingUrl(null);
    }
  }

  async function callLopesListProdutoLoja() {
    const params = new URLSearchParams();
    if (lopesListProdutoLojaCodProd) params.set("codProd", lopesListProdutoLojaCodProd);
    if (lopesListProdutoLojaEan) params.set("ean", lopesListProdutoLojaEan);
    if (lopesListProdutoLojaProductId) params.set("productId", lopesListProdutoLojaProductId);
    if (lopesListProdutoLojaDescricaoErp) params.set("descricaoErp", lopesListProdutoLojaDescricaoErp);
    if (lopesListProdutoLojaSkuId) params.set("skuId", lopesListProdutoLojaSkuId);
    if (lopesListProdutoLojaCnpjCliente) params.set("cnpjCliente", lopesListProdutoLojaCnpjCliente);
    if (lopesListProdutoLojaIdCategoria) params.set("idCategoria", lopesListProdutoLojaIdCategoria);
    const qs = params.toString();
    const url = qs ? `/api/lopes/produtos-loja?${qs}` : "/api/lopes/produtos-loja";
    setLoadingUrl(url);
    try {
      const response = await fetch(url, { cache: "no-store" });
      const payload = await readPayloadFrom(response);
      setLopesResult({ url, method: "GET", status: response.status, ok: response.ok, payload });
    } catch (error) {
      setLopesResult({
        url,
        method: "GET",
        status: 0,
        ok: false,
        payload: { message: error instanceof Error ? error.message : String(error) },
      });
    } finally {
      setLoadingUrl(null);
    }
  }

  return (

<div>

  <div className="bg-white py-10 px-4 md:px-8">
    <h1>LOPES RETAGUARDA</h1>

    <div className="mt-4 grid grid-cols-1 gap-3">
        <div className="border rounded p-3">
          <div className="text-sm font-semibold text-black">produtos-store (live)</div>
          <div className="mt-2 flex flex-col md:flex-row gap-2 md:items-center">
            <button
              type="button"
              onClick={() => void callProdutosStoreLive()}
              className="border rounded px-4 py-2 text-left hover:bg-gray-50 transition"
            >
              <div className="font-semibold text-sm text-black">live</div>
            </button>
          </div>
          <pre className="mt-3 text-xs overflow-auto whitespace-pre-wrap break-words border rounded bg-white p-3 max-h-64">
            {produtosStoreLivePretty ?? "—"}
          </pre>
        </div>

      <div className="border rounded p-3">
        <div className="text-sm font-semibold text-black">getListCategoria</div>
        <div className="mt-2 flex flex-col md:flex-row gap-2 md:items-center">
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesListCategoriaCodigo}
            onChange={(e) => setLopesListCategoriaCodigo(e.target.value)}
            placeholder="codigo (opcional)"
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesListCategoriaCodPai}
            onChange={(e) => setLopesListCategoriaCodPai(e.target.value)}
            placeholder="codPai (opcional)"
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesListCategoriaCategoria}
            onChange={(e) => setLopesListCategoriaCategoria(e.target.value)}
            placeholder="categoria (opcional)"
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesListCategoriaIdCatMarketplace}
            onChange={(e) => setLopesListCategoriaIdCatMarketplace(e.target.value)}
            placeholder="idCatMarketplace (opcional)"
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesListCategoriaNomeCatMarketplace}
            onChange={(e) => setLopesListCategoriaNomeCatMarketplace(e.target.value)}
            placeholder="nomeCatMarketplace (opcional)"
          />
          <button
            type="button"
            onClick={() => void callLopesListCategorias()}
            className="border rounded px-4 py-2 text-left hover:bg-gray-50 transition"
            disabled={loadingUrl?.startsWith("/api/lopes/categorias")}
          >
            <div className="font-semibold text-sm text-black">Consultar</div>
          </button>
        </div>
      </div>

      <div className="border rounded p-3">
        <div className="text-sm font-semibold text-black">getCategoria</div>
        <div className="mt-2 flex flex-col md:flex-row gap-2 md:items-center">
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesCategoriaCodigo}
            onChange={(e) => setLopesCategoriaCodigo(e.target.value)}
            placeholder="codigo (obrigatório)"
          />
          <button
            type="button"
            onClick={() => void callLopesCategoria()}
            className="border rounded px-4 py-2 text-left hover:bg-gray-50 transition"
            disabled={loadingUrl?.startsWith("/api/lopes/categoria")}
          >
            <div className="font-semibold text-sm text-black">Consultar</div>
          </button>
        </div>
      </div>

      <div className="border rounded p-3">
        <div className="text-sm font-semibold text-black">getProdutoLoja</div>
        <div className="mt-2 flex flex-col md:flex-row gap-2 md:items-center">
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesProdutoLojaCodProd}
            onChange={(e) => setLopesProdutoLojaCodProd(e.target.value)}
            placeholder="codProd (opcional)"
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesProdutoLojaEan}
            onChange={(e) => setLopesProdutoLojaEan(e.target.value)}
            placeholder="ean (opcional)"
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesProdutoLojaProductId}
            onChange={(e) => setLopesProdutoLojaProductId(e.target.value)}
            placeholder="productId (opcional)"
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesProdutoLojaDescricaoErp}
            onChange={(e) => setLopesProdutoLojaDescricaoErp(e.target.value)}
            placeholder="descricaoErp (opcional)"
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesProdutoLojaSkuId}
            onChange={(e) => setLopesProdutoLojaSkuId(e.target.value)}
            placeholder="skuId (opcional)"
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesProdutoLojaCnpjCliente}
            onChange={(e) => setLopesProdutoLojaCnpjCliente(e.target.value)}
            placeholder="cnpjCliente (opcional)"
          />
          <button
            type="button"
            onClick={() => void callLopesProdutoLoja()}
            className="border rounded px-4 py-2 text-left hover:bg-gray-50 transition"
            disabled={loadingUrl?.startsWith("/api/lopes/produto-loja")}
          >
            <div className="font-semibold text-sm text-black">Consultar</div>
          </button>
        </div>
      </div>

      <div className="border rounded p-3">
        <div className="text-sm font-semibold text-black">getListProdutoLoja</div>
        <div className="mt-2 flex flex-col md:flex-row gap-2 md:items-center">
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesListProdutoLojaCodProd}
            onChange={(e) => setLopesListProdutoLojaCodProd(e.target.value)}
            placeholder="codProd (opcional)"
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesListProdutoLojaEan}
            onChange={(e) => setLopesListProdutoLojaEan(e.target.value)}
            placeholder="ean (opcional)"
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesListProdutoLojaSkuId}
            onChange={(e) => setLopesListProdutoLojaSkuId(e.target.value)}
            placeholder="skuId (opcional)"
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            value={lopesListProdutoLojaIdCategoria}
            onChange={(e) => setLopesListProdutoLojaIdCategoria(e.target.value)}
            placeholder="idCategoria (opcional)"
          />
          <button
            type="button"
            onClick={() => void callLopesListProdutoLoja()}
            className="border rounded px-4 py-2 text-left hover:bg-gray-50 transition"
            disabled={loadingUrl?.startsWith("/api/lopes/produtos-loja")}
          >
            <div className="font-semibold text-sm text-black">Consultar</div>
          </button>
        </div>
      </div>
    </div>
  </div>

  <div className="bg-gray-100 py-10 px-4 md:px-8">
    <div className="text-sm font-semibold text-black">retorno lopes</div>
    <div className="mt-1 text-xs text-gray-700">
      {lopesResult ? `${lopesResult.status} ${lopesResult.ok ? "OK" : "ERRO"} — ${lopesResult.url}` : "—"}
    </div>
    <pre className="mt-3 text-xs overflow-auto whitespace-pre-wrap break-words border rounded bg-white p-3">
      {lopesResult ? JSON.stringify(lopesResult.payload, null, 2) : "Sem retorno ainda."}
    </pre>
  </div>

    <div className="bg-white py-10 px-4 md:px-8">




      <h1 className="font-montserrat text-black text-2xl font-semibold">dev - rotas</h1>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="border rounded px-3 py-2 text-sm"
          value={idCategoria}
          onChange={(e) => setIdCategoria(e.target.value)}
          placeholder="idCategoria"
        />
        <input
          className="border rounded px-3 py-2 text-sm"
          value={idProduto}
          onChange={(e) => setIdProduto(e.target.value)}
          placeholder="idProduto"
        />
        <input
          className="border rounded px-3 py-2 text-sm"
          value={categoriaSlug}
          onChange={(e) => setCategoriaSlug(e.target.value)}
          placeholder="categoriaSlug"
        />
        <input
          className="border rounded px-3 py-2 text-sm"
          value={codProd}
          onChange={(e) => setCodProd(e.target.value)}
          placeholder="codProd (products)"
        />
        <input
          className="border rounded px-3 py-2 text-sm"
          value={idIntegradora}
          onChange={(e) => setIdIntegradora(e.target.value)}
          placeholder="idIntegradora"
        />
        <input
          className="border rounded px-3 py-2 text-sm"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug"
        />
        <input
          className="border rounded px-3 py-2 text-sm"
          value={idBrand}
          onChange={(e) => setIdBrand(e.target.value)}
          placeholder="idBrand"
        />
        <input
          className="border rounded px-3 py-2 text-sm"
          value={clienteEmail}
          onChange={(e) => setClienteEmail(e.target.value)}
          placeholder="cliente email"
        />
        <input
          className="border rounded px-3 py-2 text-sm"
          value={clienteSenha}
          onChange={(e) => setClienteSenha(e.target.value)}
          placeholder="cliente senha"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {routes.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => void callRoute(item.url)}
            className="border rounded px-4 py-3 text-left hover:bg-gray-50 transition"
            disabled={loadingUrl === item.url}
          >
            <div className="font-semibold text-sm text-black">{item.label}</div>
            <div className="text-xs text-gray-600 break-all">{item.url}</div>
          </button>
        ))}
        <button
          type="button"
          onClick={() => void callClientesLogin()}
          className="border rounded px-4 py-3 text-left hover:bg-gray-50 transition"
          disabled={loadingUrl === "/api/clientes/login"}
        >
          <div className="font-semibold text-sm text-black">Clientes Login (POST)</div>
          <div className="text-xs text-gray-600 break-all">/api/clientes/login</div>
        </button>
      </div>

      <div className="mt-8 border rounded p-4 bg-gray-50">
        <div className="text-sm font-semibold text-black">ultimo retorno</div>
        <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
          {JSON.stringify(lastResult, null, 2)}
        </pre>
      </div>
    </div>
    </div>
  );
}
