"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useControlStore } from "@/stores/control-store";

type RouteResult = {
  url: string;
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
  const didRun = useRef(false);
  const [idCategoria, setIdCategoria] = useState("10");
  const [categoriaSlug, setCategoriaSlug] = useState("/categoria/bebidas");
  const [idProduto, setIdProduto] = useState("1001");
  const [codProd, setCodProd] = useState("1001");
  const [idIntegradora, setIdIntegradora] = useState("1");
  const [slug, setSlug] = useState("/produtos/heineken-lata-269ml");
  const [idBrand, setIdBrand] = useState("871013969");
  const [lastResult, setLastResult] = useState<RouteResult | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    console.log("[dev] live()", live());
  }, [live]);

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

  async function callRoute(url: string) {
    setLoadingUrl(url);
    try {
      const response = await fetch(url, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      const result: RouteResult = {
        url,
        status: response.status,
        ok: response.ok,
        payload,
      };
      setLastResult(result);
      console.log("[dev-route]", result);
    } catch (error) {
      const result: RouteResult = {
        url,
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

  return (
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
      </div>

      <div className="mt-8 border rounded p-4 bg-gray-50">
        <div className="text-sm font-semibold text-black">ultimo retorno</div>
        <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
          {JSON.stringify(lastResult, null, 2)}
        </pre>
      </div>
    </div>
  );
}
