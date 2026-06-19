"use client";

import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { slugify } from "@/lib/utils";

const BRAND_PLACEHOLDER_IMAGE = "https://lopesecia.com.br/img/semImagem.png";

function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? "");
  }
}

function formatDevError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Erro inesperado";
  const message = (payload as Record<string, unknown>).message;
  if (typeof message === "string" && message.trim()) return message;
  return "Erro inesperado";
}

type RedisCrudResponse =
  | { ok: true; key: string; exists?: boolean; removed?: boolean; data?: unknown }
  | { ok: false; message: string };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RedisListProductsResponse =
  | {
      ok: true;
      items: Array<{ id: string; key: string; doc: unknown }>;
    }
  | { ok: false; message: string };

type UpsertBrandResponse =
  | { ok: true; id: number; name?: string; doc?: unknown }
  | { ok: false; message: string };

type ExtractBrandResponse = { ok: true; brandName: string | null } | { error: string };

type CatalogHealthScan = { match: string; count: number; sample: string[] };

type CatalogHealthResponse =
  | {
      ok: true;
      ping: string;
      prefix: string;
      modules?: unknown;
      jsonGetOk?: boolean;
      indexes?: string[];
      keys?: {
        categories?: CatalogHealthScan;
        brands?: CatalogHealthScan;
        products?: CatalogHealthScan;
      };
    }
  | { ok: false; message?: string };

function pickFirstString(values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickFirstNumber(values: unknown[]): number | null {
  for (const v of values) {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function getProductName(doc: Record<string, unknown>) {
  return (
    pickFirstString([doc.name, doc.nome, doc.descricao, doc.titulo]) ??
    pickFirstString([doc.produto, doc.produtoNome, doc.productName]) ??
    "—"
  );
}

function getProductPrice(doc: Record<string, unknown>) {
  const value = pickFirstNumber([doc.price, doc.preco, doc.valor, doc.priceSale, doc.precoVenda]);
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getProductStock(doc: Record<string, unknown>) {
  const value = pickFirstNumber([doc.stock, doc.estoque, doc.qtdEstoque, doc.saldo, doc.quantidade]);
  if (value === null) return "—";
  return String(value);
}

function getProductCategory(doc: Record<string, unknown>) {
  const categoryObj = doc.category && typeof doc.category === "object" && !Array.isArray(doc.category) ? (doc.category as Record<string, unknown>) : null;
  const id = categoryObj ? pickFirstNumber([categoryObj.id, categoryObj.categoryId]) : null;
  const name = categoryObj ? pickFirstString([categoryObj.name, categoryObj.nome]) : null;
  if (id === 0) return "—";
  if (name) return name;
  const value = pickFirstNumber([doc.categoryId, doc.categoriaPrincipal, doc.categoria, doc.category]);
  if (value === null || value === 0) return "—";
  return String(value);
}

function getProductBrand(doc: Record<string, unknown>) {
  const brandObj = doc.brand && typeof doc.brand === "object" && !Array.isArray(doc.brand) ? (doc.brand as Record<string, unknown>) : null;
  const nameFromObj = brandObj ? pickFirstString([brandObj.nome, brandObj.name]) : null;
  return nameFromObj ?? pickFirstString([doc.marca, doc.brand, doc.fabricante, doc.brandName]) ?? "—";
}

export default function RedisSection() {
  const [healthLoading, setHealthLoading] = useState(false);
  const [health, setHealth] = useState<CatalogHealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [opsLoading, setOpsLoading] = useState(false);
  const [opsResult, setOpsResult] = useState<string>("");
  const [opsError, setOpsError] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [crudLoading, setCrudLoading] = useState(false);
  const [crudKey, setCrudKey] = useState<string | null>(null);
  const [jsonValue, setJsonValue] = useState("");
  const [crudError, setCrudError] = useState<string | null>(null);

  const hasJson = useMemo(() => Boolean(jsonValue.trim()), [jsonValue]);

  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [products, setProducts] = useState<Array<{ id: string; key: string; doc: Record<string, unknown> }>>([]);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === selectedProductId) ?? null;
  }, [products, selectedProductId]);

  const [newBrandName, setNewBrandName] = useState("");
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandInfo, setBrandInfo] = useState<string>("");

  const [bulkBrandsLoading, setBulkBrandsLoading] = useState(false);
  const [bulkBrandsError, setBulkBrandsError] = useState<string | null>(null);
  const [bulkBrandsProgress, setBulkBrandsProgress] = useState<{
    total: number;
    processed: number;
    applied: number;
    skipped: number;
    errors: number;
  } | null>(null);

  const [brandShapeLoading, setBrandShapeLoading] = useState(false);
  const [brandShapeError, setBrandShapeError] = useState<string | null>(null);
  const [brandShapeResult, setBrandShapeResult] = useState<string>("");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function loadProducts(limit = 60) {
    if (productsLoading) return;
    setProductsLoading(true);
    setProductsError(null);

    try {
      const response = await fetch(`/api/producao/catalog/list/products?limit=${encodeURIComponent(String(limit))}`, {
        method: "GET",
      });
      const payload = (await response.json().catch(() => null)) as unknown as RedisListProductsResponse | null;
      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload && "message" in payload ? String(payload.message) : "Erro ao carregar lista");
      }
      const next = payload.items
        .map((item) => ({
          id: String(item.id ?? ""),
          key: String(item.key ?? ""),
          doc: item.doc && typeof item.doc === "object" && !Array.isArray(item.doc) ? (item.doc as Record<string, unknown>) : {},
        }))
        .filter((item) => Boolean(item.id));

      setProducts(next);
      if (!selectedProductId && next.length) setSelectedProductId(next[0].id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setProductsError(message);
    } finally {
      setProductsLoading(false);
    }
  }

  async function createBrandByName(name: string) {
    if (brandLoading) return null;
    setBrandLoading(true);
    setBrandError(null);
    setBrandInfo("");

    try {
      const response = await fetch("/api/producao/catalog/brand/upsert-by-name", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json().catch(() => null)) as unknown as UpsertBrandResponse | null;
      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload && "message" in payload ? String(payload.message) : "Erro ao cadastrar marca");
      }
      setBrandInfo(`Marca cadastrada: ${payload.id}`);
      return payload.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setBrandError(message);
      return null;
    } finally {
      setBrandLoading(false);
    }
  }

  async function detectBrandAndApply() {
    if (brandLoading) return;
    setBrandError(null);
    setBrandInfo("");

    try {
      if (!selectedProduct) throw new Error("Selecione um produto na tabela");

      const responseAi = await fetch("/api/ai/extract-brand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: selectedProduct.doc }),
      });
      const payloadAi = (await responseAi.json().catch(() => null)) as unknown as ExtractBrandResponse | null;
      const brandName =
        payloadAi && "ok" in payloadAi && payloadAi.ok ? payloadAi.brandName : null;
      if (!brandName) throw new Error("IA não conseguiu inferir a marca desse produto");

      const brandId = await createBrandByName(brandName);
      if (!brandId) return;

      const nextDoc: Record<string, unknown> = { ...selectedProduct.doc };
      nextDoc.brand = {
        id: brandId,
        nome: brandName,
        slug: `/marca/${slugify(brandName) || "no-brand"}`,
        image: BRAND_PLACEHOLDER_IMAGE,
      };
      delete nextDoc.brandId;
      delete nextDoc.marca;

      const responseSave = await fetch(`/api/producao/catalog/crud/product/${encodeURIComponent(selectedProduct.id)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc: nextDoc }),
      });
      const payloadSave = (await responseSave.json().catch(() => null)) as unknown as RedisCrudResponse | null;
      if (!responseSave.ok || !payloadSave || !payloadSave.ok) {
        throw new Error(payloadSave && "message" in payloadSave ? String(payloadSave.message) : "Erro ao salvar produto");
      }

      setProducts((current) =>
        current.map((p) => (p.id === selectedProduct.id ? { ...p, doc: nextDoc } : p))
      );
      setJsonValue(stringifyJson(nextDoc));
      setCrudKey(payloadSave.key);
      setBrandInfo(`Marca aplicada: ${brandName} (id ${brandId})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setBrandError(message);
    }
  }

  async function bulkDetectBrandsAndApply() {
    if (bulkBrandsLoading) return;
    setBulkBrandsLoading(true);
    setBulkBrandsError(null);
    setBrandInfo("");

    try {
      const responseList = await fetch(`/api/producao/catalog/list/products?limit=${encodeURIComponent(String(200))}`, {
        method: "GET",
      });
      const payloadList = (await responseList.json().catch(() => null)) as unknown as RedisListProductsResponse | null;
      if (!responseList.ok || !payloadList || !payloadList.ok) {
        throw new Error(payloadList && "message" in payloadList ? String(payloadList.message) : "Erro ao carregar lista");
      }

      const list = payloadList.items
        .map((item) => ({
          id: String(item.id ?? ""),
          key: String(item.key ?? ""),
          doc: item.doc && typeof item.doc === "object" && !Array.isArray(item.doc) ? (item.doc as Record<string, unknown>) : {},
        }))
        .filter((item) => Boolean(item.id));

      setProducts(list);
      if (!selectedProductId && list.length) setSelectedProductId(list[0].id);

      const cache = new Map<string, number>();
      const totals = { total: list.length, processed: 0, applied: 0, skipped: 0, errors: 0 };
      setBulkBrandsProgress({ ...totals });

      for (const item of list) {
        totals.processed += 1;
        setBulkBrandsProgress({ ...totals });

        const existingBrandObj =
          item.doc.brand && typeof item.doc.brand === "object" && !Array.isArray(item.doc.brand)
            ? (item.doc.brand as Record<string, unknown>)
            : null;
        const existingBrandId = existingBrandObj ? pickFirstNumber([existingBrandObj.id]) : null;
        const existingBrandName = existingBrandObj ? pickFirstString([existingBrandObj.nome, existingBrandObj.name]) : null;
        const existingBrandNameNorm = (existingBrandName ?? "").trim().toLowerCase();
        const hasRealBrandName =
          Boolean(existingBrandNameNorm) && existingBrandNameNorm !== "no brand" && existingBrandNameNorm !== "sem marca";
        if ((existingBrandId !== null && existingBrandId > 0) || hasRealBrandName) {
          totals.skipped += 1;
          setBulkBrandsProgress({ ...totals });
          continue;
        }

        try {
          const responseAi = await fetch("/api/ai/extract-brand", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ product: item.doc }),
          });
          const payloadAi = (await responseAi.json().catch(() => null)) as unknown as ExtractBrandResponse | null;
          const brandName =
            payloadAi && "ok" in payloadAi && payloadAi.ok ? payloadAi.brandName : null;
          if (!brandName) {
            totals.skipped += 1;
            setBulkBrandsProgress({ ...totals });
            continue;
          }

          const cacheKey = brandName.trim().toLowerCase();
          let brandId: number | null = cache.get(cacheKey) ?? null;
          if (!brandId) {
            const responseUpsert = await fetch("/api/producao/catalog/brand/upsert-by-name", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ name: brandName }),
            });
            const payloadUpsert = (await responseUpsert.json().catch(() => null)) as unknown as UpsertBrandResponse | null;
            if (!responseUpsert.ok || !payloadUpsert || !payloadUpsert.ok) {
              throw new Error(payloadUpsert && "message" in payloadUpsert ? String(payloadUpsert.message) : "Erro ao cadastrar marca");
            }
            brandId = payloadUpsert.id;
            cache.set(cacheKey, brandId);
          }

          const nextDoc: Record<string, unknown> = { ...item.doc };
          nextDoc.brand = {
            id: brandId,
            nome: brandName,
            slug: `/marca/${slugify(brandName) || "no-brand"}`,
            image: BRAND_PLACEHOLDER_IMAGE,
          };
          delete nextDoc.brandId;
          delete nextDoc.marca;

          const responseSave = await fetch(`/api/producao/catalog/crud/product/${encodeURIComponent(item.id)}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ doc: nextDoc }),
          });
          const payloadSave = (await responseSave.json().catch(() => null)) as unknown as RedisCrudResponse | null;
          if (!responseSave.ok || !payloadSave || !payloadSave.ok) {
            throw new Error(payloadSave && "message" in payloadSave ? String(payloadSave.message) : "Erro ao salvar produto");
          }

          totals.applied += 1;
          setProducts((current) => current.map((p) => (p.id === item.id ? { ...p, doc: nextDoc } : p)));
          setBulkBrandsProgress({ ...totals });
        } catch {
          totals.errors += 1;
          setBulkBrandsProgress({ ...totals });
        }

        await sleep(120);
      }

      setBrandInfo(
        `Marcas em lote: aplicadas ${totals.applied}/${totals.total} · ignoradas ${totals.skipped} · erros ${totals.errors}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setBulkBrandsError(message);
    } finally {
      setBulkBrandsLoading(false);
    }
  }

  async function sendChatMessage(custom?: string) {
    const text = (custom ?? chatInput).trim();
    if (!text) return;
    if (chatLoading) return;
    setChatLoading(true);

    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: text }];
    setChatMessages(nextMessages);
    setChatInput("");

    try {
      const response = await fetch("/api/ai/brand-assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          productContext: {},
          catalogContext: selectedProduct
            ? {
                kind: "redis",
                productId: selectedProduct.id,
                product: selectedProduct.doc,
                health,
              }
            : { kind: "redis", health },
        }),
      });
      const payload = (await response.json().catch(() => null)) as unknown as { answer?: string; error?: string } | null;
      const answer = payload?.answer ?? payload?.error ?? "Não consegui responder agora.";
      setChatMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch {
      setChatMessages((current) => [...current, { role: "assistant", content: "Erro ao falar com a IA." }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function loadHealth() {
    if (healthLoading) return;
    setHealthLoading(true);
    setHealthError(null);

    try {
      const response = await fetch("/api/catalog/health", { method: "GET" });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw new Error(formatDevError(payload));
      setHealth(payload && typeof payload === "object" ? (payload as CatalogHealthResponse) : null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setHealthError(message);
    } finally {
      setHealthLoading(false);
    }
  }

  async function runDevOp(path: string) {
    if (opsLoading) return;
    setOpsLoading(true);
    setOpsError(null);
    setOpsResult("");

    try {
      const response = await fetch(path, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw new Error(formatDevError(payload));
      setOpsResult(stringifyJson(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setOpsError(message);
    } finally {
      setOpsLoading(false);
    }
  }

  async function migrateBrandShape() {
    if (brandShapeLoading) return;
    setBrandShapeLoading(true);
    setBrandShapeError(null);
    setBrandShapeResult("");

    try {
      const response = await fetch("/api/producao/catalog/migrate/brand-shape", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw new Error(formatDevError(payload));
      setBrandShapeResult(stringifyJson(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setBrandShapeError(message);
    } finally {
      setBrandShapeLoading(false);
    }
  }

  async function crudGet() {
    if (crudLoading) return;
    setCrudLoading(true);
    setCrudError(null);

    try {
      const id = productId.trim();
      if (!id) throw new Error("Informe o id do produto");
      const response = await fetch(`/api/producao/catalog/crud/product/${encodeURIComponent(id)}`, { method: "GET" });
      const payload = (await response.json().catch(() => null)) as unknown as RedisCrudResponse | null;
      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload && "message" in payload ? String(payload.message) : "Erro ao carregar");
      }
      setCrudKey(payload.key);
      setJsonValue(payload.data ? stringifyJson(payload.data) : "");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setCrudError(message);
    } finally {
      setCrudLoading(false);
    }
  }

  async function crudSave() {
    if (crudLoading) return;
    setCrudLoading(true);
    setCrudError(null);

    try {
      const id = productId.trim();
      if (!id) throw new Error("Informe o id do produto");
      if (!jsonValue.trim()) throw new Error("Cole/edite o JSON do produto antes de salvar");

      let doc: unknown = null;
      try {
        doc = JSON.parse(jsonValue);
      } catch {
        throw new Error("JSON inválido");
      }
      if (!doc || typeof doc !== "object" || Array.isArray(doc)) throw new Error("JSON deve ser um objeto");

      const response = await fetch(`/api/producao/catalog/crud/product/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc }),
      });
      const payload = (await response.json().catch(() => null)) as unknown as RedisCrudResponse | null;
      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload && "message" in payload ? String(payload.message) : "Erro ao salvar");
      }
      setCrudKey(payload.key);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setCrudError(message);
    } finally {
      setCrudLoading(false);
    }
  }

  async function crudDelete() {
    if (crudLoading) return;
    setCrudLoading(true);
    setCrudError(null);

    try {
      const id = productId.trim();
      if (!id) throw new Error("Informe o id do produto");
      const ok = window.confirm(`Remover do Redis o produto ${id}?`);
      if (!ok) return;

      const response = await fetch(`/api/producao/catalog/crud/product/${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as unknown as RedisCrudResponse | null;
      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload && "message" in payload ? String(payload.message) : "Erro ao remover");
      }
      setCrudKey(payload.key);
      setJsonValue("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setCrudError(message);
    } finally {
      setCrudLoading(false);
    }
  }

  return (
    <div className="grid min-h-0 gap-4 md:grid-cols-[460px_1fr]">
      <Card className="min-h-0">
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Redis (Catálogo)</CardTitle>
          <p className="text-xs text-muted-foreground">Operações rápidas e CRUD de produto (PRODUCAO).</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="default" size="sm" onClick={loadHealth} disabled={healthLoading}>
              Health
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => runDevOp("/api/producao/catalog/sync?only=produtos")}
              disabled={opsLoading}
            >
              Sync produtos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => runDevOp("/api/producao/catalog/index?drop=0")}
              disabled={opsLoading}
            >
              Garantir índice
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => runDevOp("/api/producao/catalog/clean?types=product")}
              disabled={opsLoading}
            >
              Limpar produtos
            </Button>
          </div>

          {healthError ? (
            <Alert variant="destructive">
              <AlertTitle>Health falhou</AlertTitle>
              <AlertDescription>{healthError}</AlertDescription>
            </Alert>
          ) : null}

          {healthLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : health ? (
            <div className="rounded-xl border bg-muted/20 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">Prefixo</span>
                <span className="text-muted-foreground">{String(health.ok ? health.prefix ?? "—" : "—")}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-background p-2">
                  <p className="font-semibold">Produtos</p>
                  <p className="text-muted-foreground">
                    {String(health.ok ? health.keys?.products?.count ?? "—" : "—")}
                  </p>
                </div>
                <div className="rounded-lg bg-background p-2">
                  <p className="font-semibold">Índices</p>
                  <p className="truncate text-muted-foreground">{String(health.ok ? health.indexes?.length ?? "—" : "—")}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground">
              Clique em <span className="font-semibold text-foreground">Health</span> para ver status, módulos e índice.
            </div>
          )}

          {opsError ? (
            <Alert variant="destructive">
              <AlertTitle>Operação falhou</AlertTitle>
              <AlertDescription>{opsError}</AlertDescription>
            </Alert>
          ) : null}

          {opsResult ? (
            <div className="rounded-xl border bg-background p-3">
              <p className="text-xs font-semibold text-foreground">Resultado</p>
              <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-100">
                {opsResult}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="min-h-0">
          <CardHeader className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Produtos (Redis)</CardTitle>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => loadProducts(80)} disabled={productsLoading}>
                  Atualizar lista
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (selectedProduct) {
                      setProductId(selectedProduct.id);
                      setJsonValue(stringifyJson(selectedProduct.doc));
                      setCrudKey(selectedProduct.key);
                    }
                  }}
                  disabled={!selectedProduct}
                >
                  Abrir no editor
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tabela simples para inspeção rápida. Clique em uma linha para selecionar.
            </p>
          </CardHeader>
          <CardContent className="min-h-0 space-y-3">
            {productsError ? (
              <Alert variant="destructive">
                <AlertTitle>Falha ao listar</AlertTitle>
                <AlertDescription>{productsError}</AlertDescription>
              </Alert>
            ) : null}

            {productsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : products.length ? (
              <div className="max-h-[420px] overflow-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[92px]">ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-[120px]">Preço</TableHead>
                      <TableHead className="w-[90px]">Estoque</TableHead>
                      <TableHead className="w-[110px]">Categoria</TableHead>
                      <TableHead className="w-[160px]">Marca</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => (
                      <TableRow
                        key={p.key}
                        data-state={p.id === selectedProductId ? "selected" : undefined}
                        className="cursor-pointer"
                        onClick={() => setSelectedProductId(p.id)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.id}</TableCell>
                        <TableCell className="max-w-[420px] truncate">{getProductName(p.doc)}</TableCell>
                        <TableCell>{getProductPrice(p.doc)}</TableCell>
                        <TableCell>{getProductStock(p.doc)}</TableCell>
                        <TableCell>{getProductCategory(p.doc)}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{getProductBrand(p.doc)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground">
                Clique em <span className="font-semibold text-foreground">Atualizar lista</span> para carregar produtos do
                Redis.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Editor + Marca + Chat</CardTitle>
            <p className="text-xs text-muted-foreground">
              Produto selecionado: {selectedProduct?.id ?? "—"} · Chave: {crudKey ?? "—"}
            </p>
          </CardHeader>
          <CardContent className="min-h-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="idProduto (numérico)"
                className="h-9 w-44"
              />
              <Button type="button" variant="outline" size="sm" onClick={crudGet} disabled={crudLoading}>
                Carregar
              </Button>
              <Button type="button" variant="default" size="sm" onClick={crudSave} disabled={crudLoading || !hasJson}>
                Salvar
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={crudDelete} disabled={crudLoading}>
                Remover
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={detectBrandAndApply} disabled={brandLoading || !selectedProduct}>
                IA: detectar marca e aplicar
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void bulkDetectBrandsAndApply()}
                disabled={bulkBrandsLoading}
              >
                IA: cadastrar marcas (todos)
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void migrateBrandShape()} disabled={brandShapeLoading}>
                Padronizar marcas (Redis)
              </Button>
              <div className="flex min-w-[240px] flex-1 items-center gap-2">
                <Input
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Cadastrar marca manual (nome)"
                  className="h-9"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const name = newBrandName.trim();
                    if (!name) return;
                    void createBrandByName(name);
                  }}
                  disabled={brandLoading || !newBrandName.trim()}
                >
                  Cadastrar
                </Button>
              </div>
            </div>

            {crudError ? (
              <Alert variant="destructive">
                <AlertTitle>CRUD falhou</AlertTitle>
                <AlertDescription>{crudError}</AlertDescription>
              </Alert>
            ) : null}

            {brandError ? (
              <Alert variant="destructive">
                <AlertTitle>Marca</AlertTitle>
                <AlertDescription>{brandError}</AlertDescription>
              </Alert>
            ) : null}

            {bulkBrandsError ? (
              <Alert variant="destructive">
                <AlertTitle>Lote de marcas</AlertTitle>
                <AlertDescription>{bulkBrandsError}</AlertDescription>
              </Alert>
            ) : null}

            {bulkBrandsProgress ? (
              <div className="rounded-xl border bg-muted/10 px-3 py-2 text-xs text-foreground">
                Processando: {bulkBrandsProgress.processed}/{bulkBrandsProgress.total} · aplicadas {bulkBrandsProgress.applied} · ignoradas{" "}
                {bulkBrandsProgress.skipped} · erros {bulkBrandsProgress.errors}
              </div>
            ) : null}

            {brandInfo ? (
              <div className="rounded-xl border bg-muted/20 px-3 py-2 text-xs text-foreground">{brandInfo}</div>
            ) : null}

            {brandShapeError ? (
              <Alert variant="destructive">
                <AlertTitle>Padronização</AlertTitle>
                <AlertDescription>{brandShapeError}</AlertDescription>
              </Alert>
            ) : null}

            {brandShapeResult ? (
              <div className="rounded-xl border bg-muted/10 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Resultado (padronização)</p>
                <pre className="max-h-[220px] overflow-auto text-xs">{brandShapeResult}</pre>
              </div>
            ) : null}

            <div className="min-h-0">
              <textarea
                value={jsonValue}
                onChange={(e) => setJsonValue(e.target.value)}
                placeholder="JSON do produto (objeto)."
                className="h-[260px] w-full resize-none rounded-xl border bg-background p-3 font-mono text-[12px] leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Dica: depois de sincronizar, use o editor para ajuste fino por produto.
              </p>
            </div>

            <div className="rounded-xl border bg-background">
              <div className="border-b px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Chat</p>
              </div>
              <div className="max-h-[200px] overflow-auto p-3 text-sm">
                {chatMessages.length ? (
                  <div className="space-y-2">
                    {chatMessages.map((m, idx) => (
                      <div
                        key={`${m.role}-${idx}`}
                        className={
                          m.role === "user"
                            ? "ml-auto max-w-[90%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground"
                            : "mr-auto max-w-[90%] whitespace-pre-wrap rounded-2xl bg-muted px-3 py-2 text-foreground"
                        }
                      >
                        {m.content}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Pergunte sobre Redis/catálogo ou peça ajuda para padronizar marcas e categorias.
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 border-t p-3">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Digite sua pergunta…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void sendChatMessage();
                  }}
                />
                <Button type="button" onClick={() => void sendChatMessage()} disabled={chatLoading}>
                  {chatLoading ? "…" : "Enviar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
