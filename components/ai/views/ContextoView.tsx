"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/utils";

type UnknownRecord = Record<string, unknown>;

type OverwriteFlags = {
  category: 0 | 1;
  brand: 0 | 1;
  image: 0 | 1;
  name: 0 | 1;
  slug: 0 | 1;
};

const DEFAULT_GLOBAL_OVERWRITE_FLAGS: OverwriteFlags = { category: 0, brand: 1, image: 0, name: 0, slug: 0 };

function getPageName(pathname: string | null): string {
  const raw = String(pathname ?? "").trim();
  if (!raw || raw === "/") return "home";
  const cleaned = raw.startsWith("/") ? raw.slice(1) : raw;
  const first = cleaned.split("/").filter(Boolean)[0] ?? "";
  return first || "home";
}

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function normalizeFlag(value: unknown): 0 | 1 {
  if (value === true) return 1;
  if (value === false) return 0;
  if (value === 1 || value === "1") return 1;
  return 0;
}

function toOverwriteFlags(value: unknown): OverwriteFlags {
  const record = asRecord(value);
  if (!record) return DEFAULT_GLOBAL_OVERWRITE_FLAGS;
  return {
    category: normalizeFlag(record.category),
    brand: normalizeFlag(record.brand),
    image: normalizeFlag(record.image),
    name: normalizeFlag(record.name),
    slug: normalizeFlag(record.slug),
  };
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeProductSlug(idProduto: number, name: string, slug: string) {
  const provided = String(slug ?? "").trim();
  if (provided) {
    const withoutLeading = provided.replace(/^\/+/, "");
    return withoutLeading.startsWith("produtos/") ? `/${withoutLeading}` : `/produtos/${withoutLeading}`;
  }

  const baseSlug = slugify(name);
  return `/produtos/${baseSlug || `produto-${idProduto}`}-${idProduto}`;
}

function pickProdutoSubset(value: unknown) {
  const record = asRecord(value);

  return {
    id: asNumber(record?.id),
    sku: asString(record?.sku),
    slug: asString(record?.slug),
    name: asString(record?.name),
    price: typeof record?.price === "number" ? record.price : asNumber(record?.price),
    compareAtPrice: typeof record?.compareAtPrice === "number" ? record.compareAtPrice : asNumber(record?.compareAtPrice),
    stock: typeof record?.stock === "number" ? record.stock : asNumber(record?.stock),
    inStock: typeof record?.inStock === "boolean" ? record.inStock : record?.inStock ? true : record?.inStock === false ? false : null,
    unitLabel: asString(record?.unitLabel),
    sizeLabel: asString(record?.sizeLabel),
    qtUnit: typeof record?.qtUnit === "number" ? record.qtUnit : asNumber(record?.qtUnit),
    qtPalete: typeof record?.qtPalete === "number" ? record.qtPalete : asNumber(record?.qtPalete),
  };
}

function buildDiffs(a: ReturnType<typeof pickProdutoSubset>, b: ReturnType<typeof pickProdutoSubset>) {
  const diffs: { path: string; contrato: unknown; redis: unknown }[] = [];

  const add = (path: string, left: unknown, right: unknown) => {
    if (left !== right) diffs.push({ path, contrato: left, redis: right });
  };

  add("id", a.id, b.id);
  add("sku", a.sku, b.sku);
  add("slug", a.slug, b.slug);
  add("name", a.name, b.name);
  add("price", a.price, b.price);
  add("compareAtPrice", a.compareAtPrice, b.compareAtPrice);
  add("stock", a.stock, b.stock);
  add("inStock", a.inStock, b.inStock);
  add("unitLabel", a.unitLabel, b.unitLabel);
  add("sizeLabel", a.sizeLabel, b.sizeLabel);
  add("qtUnit", a.qtUnit, b.qtUnit);
  add("qtPalete", a.qtPalete, b.qtPalete);

  return diffs;
}

export default function ContextoView({
  contratoRaw,
  contratoView,
  setSyncRawAction,
  openJson,
}: {
  contratoRaw: unknown | null;
  contratoView: unknown | null;
  setSyncRawAction: (action: null | (() => Promise<void>)) => void;
  openJson: (json: string) => void;
}) {
  const pathname = usePathname();
  const pageName = getPageName(pathname);
  const [redisLoading, setRedisLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [idProduto, setIdProduto] = useState("");
  const [stock, setStock] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productName, setProductName] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [globalOverwriteLoading, setGlobalOverwriteLoading] = useState(false);
  const [globalOverwriteSaving, setGlobalOverwriteSaving] = useState(false);
  const [globalOverwriteFlags, setGlobalOverwriteFlags] = useState<OverwriteFlags>(DEFAULT_GLOBAL_OVERWRITE_FLAGS);

  useEffect(() => {
    const rawRecord = asRecord(contratoRaw);
    const id = asNumber(rawRecord?.id);
    setIdProduto(id ? String(id) : "");
    setStock("");
    setBrandId("");
    setProductName(asString(rawRecord?.name) ?? "");
    setProductSlug(asString(rawRecord?.slug) ?? "");
    setSyncRawAction(null);
  }, [contratoRaw, setSyncRawAction]);

  useEffect(() => {
    let active = true;

    (async () => {
      setGlobalOverwriteLoading(true);
      try {
        const response = await fetch("/api/catalog/produtos/overwrite/global");
        const body = await response.json().catch(() => null);
        if (!active) return;
        const flags = toOverwriteFlags(asRecord(body)?.success === true ? asRecord(body)?.data : null);
        setGlobalOverwriteFlags(flags);
      } catch {
        if (!active) return;
        setGlobalOverwriteFlags(DEFAULT_GLOBAL_OVERWRITE_FLAGS);
      } finally {
        if (active) setGlobalOverwriteLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const validateSync = async (id: number) => {
    const response = await fetch(`/api/catalog/produtos/by-id/${id}`);
    const body = await response.json().catch(() => null);

    const bodyRecord = asRecord(body);
    const redisProduto =
      bodyRecord && bodyRecord.success === true ? bodyRecord.data : bodyRecord && "data" in bodyRecord ? bodyRecord.data : null;

    const contratoSubset = pickProdutoSubset(contratoRaw);
    const redisSubset = pickProdutoSubset(redisProduto);
    const divergencias = buildDiffs(contratoSubset, redisSubset);

    if (divergencias.length === 0) {
      setSyncRawAction(null);
      openJson(JSON.stringify({ sync: true }, null, 2));
      return { ok: true as const, divergencias: [] as typeof divergencias };
    }

    setSyncRawAction(async () => {
      const patch = pickProdutoSubset(contratoRaw);
      const response = await fetch("/api/producao/redis/catalog/produto/sync-raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idProduto: id, patch }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !asRecord(body)?.ok) {
        openJson(JSON.stringify(body ?? { ok: false }, null, 2));
        return;
      }
      await validateSync(id);
    });
    openJson(JSON.stringify({ sync: false, divergencias }, null, 2));
    return { ok: false as const, divergencias };
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 text-sm">
      <div className="space-y-3">
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-zinc-900">Contexto</p>
          <div className="mt-2 space-y-1">
            <p className="text-xs font-semibold text-zinc-900">Página: {pageName}</p>
            <p className="text-xs text-zinc-600">Rota: {pathname || "/"}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900">Dados Dinamicos</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const payload = {
                  page: pageName,
                  pathname: pathname || "/",
                  contratoRaw,
                  contratoView,
                };
                openJson(JSON.stringify(payload, null, 2));
              }}
            >
              Ver JSON
            </Button>
          </div>
          {!contratoRaw && !contratoView ? (
            <p className="mt-1 text-xs text-zinc-600">Sem dados de contrato para esta rota.</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900">Redis</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={redisLoading || syncLoading}
                onClick={() => {
                  const payloadBase = {
                    page: pageName,
                    pathname: pathname || "/",
                  };

                  const id = asNumber(asRecord(contratoRaw)?.id);
                  if (!id) {
                    openJson(
                      JSON.stringify({ ...payloadBase, redis: { ok: false, error: "id não disponível" } }, null, 2)
                    );
                    return;
                  }

                  (async () => {
                    setRedisLoading(true);
                    try {
                      const response = await fetch(`/api/catalog/produtos/by-id/${id}`);
                      const body = await response.json().catch(() => null);
                      openJson(
                        JSON.stringify(
                          { ...payloadBase, redis: { ok: response.ok, status: response.status, body } },
                          null,
                          2
                        )
                      );
                    } catch (error) {
                      openJson(
                        JSON.stringify(
                          {
                            ...payloadBase,
                            redis: { ok: false, error: error instanceof Error ? error.message : "Erro ao consultar Redis" },
                          },
                          null,
                          2
                        )
                      );
                    } finally {
                      setRedisLoading(false);
                    }
                  })();
                }}
              >
                {redisLoading ? "Consultando..." : "Checar Redis"}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={redisLoading || syncLoading}
                onClick={() => {
                  const payloadBase = {
                    page: pageName,
                    pathname: pathname || "/",
                  };

                  const id = asNumber(asRecord(contratoRaw)?.id);
                  if (!id) {
                    openJson(
                      JSON.stringify({ ...payloadBase, sync: { ok: false, error: "id não disponível" } }, null, 2)
                    );
                    return;
                  }

                  (async () => {
                    setSyncLoading(true);
                    try {
                      await validateSync(id);
                    } catch (error) {
                      setSyncRawAction(null);
                      openJson(
                        JSON.stringify(
                          {
                            ...payloadBase,
                            sync: { ok: false, error: error instanceof Error ? error.message : "Erro ao validar sync" },
                          },
                          null,
                          2
                        )
                      );
                    } finally {
                      setSyncLoading(false);
                    }
                  })();
                }}
              >
                {syncLoading ? "Validando..." : "Validar Sync"}
              </Button>
            </div>
          </div>
          <p className="mt-1 text-xs text-zinc-600">Consulta o read model do catálogo (Redis) para este produto.</p>
        </div>

        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900">Overwrite (GLOBAL)</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={globalOverwriteLoading || globalOverwriteSaving}
              onClick={() => {
                (async () => {
                  setGlobalOverwriteSaving(true);
                  try {
                    const response = await fetch("/api/catalog/produtos/overwrite/global", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(globalOverwriteFlags),
                    });
                    const body = await response.json().catch(() => null);
                    openJson(JSON.stringify(body, null, 2));
                  } catch (error) {
                    openJson(
                      JSON.stringify(
                        { success: false, message: error instanceof Error ? error.message : "Erro ao salvar overwrite global" },
                        null,
                        2
                      )
                    );
                  } finally {
                    setGlobalOverwriteSaving(false);
                  }
                })();
              }}
            >
              {globalOverwriteSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>

          {globalOverwriteLoading ? (
            <p className="mt-1 text-xs text-zinc-600">Carregando...</p>
          ) : (
            <div className="mt-3 space-y-2">
              {(
                [
                  { key: "category" as const, label: "category" },
                  { key: "brand" as const, label: "brand" },
                  { key: "image" as const, label: "image" },
                  { key: "name" as const, label: "name" },
                  { key: "slug" as const, label: "slug" },
                ] satisfies { key: keyof OverwriteFlags; label: string }[]
              ).map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-zinc-700">{item.label}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={
                      globalOverwriteFlags[item.key] === 1
                        ? "border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
                        : "border-red-600 text-red-700 hover:bg-red-50 hover:text-red-800"
                    }
                    onClick={() =>
                      setGlobalOverwriteFlags((current) => ({
                        ...current,
                        [item.key]: current[item.key] === 1 ? 0 : 1,
                      }))
                    }
                  >
                    {globalOverwriteFlags[item.key] === 1 ? "ON" : "OFF"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <details className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4" open={false}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-900">PRODUCAO</p>
            <ChevronDown size={16} className="text-zinc-700" />
          </summary>

          <div className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-white p-4">
            <p className="text-sm font-semibold text-zinc-900">Update Redis Data</p>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <p className="text-xs font-medium text-zinc-700">idProduto</p>
                <Input
                  value={idProduto}
                  onChange={(e) => setIdProduto(e.target.value)}
                  placeholder="Ex.: 77"
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-700">stock</p>
                <Input
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="Ex.: 45"
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-700">idBrand</p>
                <Input
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  placeholder="Ex.: 10"
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-700">name</p>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Nome final do produto"
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-700">slug</p>
                <Input
                  value={productSlug}
                  onChange={(e) => setProductSlug(e.target.value)}
                  placeholder="/produtos/nome-do-produto-77"
                  className="mt-1 h-9"
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Se deixar vazio, o sistema gera o slug a partir do nome e do id.
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={updateLoading}
                onClick={() => {
                  const parsedId = asNumber(idProduto);
                  const parsedStock = asNumber(stock);

                  if (!parsedId || parsedId <= 0 || !Number.isInteger(parsedId)) {
                    openJson(JSON.stringify({ ok: false, message: "idProduto inválido" }, null, 2));
                    return;
                  }

                  if (parsedStock === null || parsedStock < 0) {
                    openJson(JSON.stringify({ ok: false, message: "stock inválido" }, null, 2));
                    return;
                  }

                  (async () => {
                    setUpdateLoading(true);
                    try {
                      const response = await fetch("/api/producao/redis/catalog/produto/stock", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ idProduto: parsedId, stock: parsedStock }),
                      });
                      const body = await response.json().catch(() => null);
                      openJson(JSON.stringify(body, null, 2));
                    } catch (error) {
                      openJson(
                        JSON.stringify(
                          { ok: false, message: error instanceof Error ? error.message : "Erro ao atualizar Redis" },
                          null,
                          2
                        )
                      );
                    } finally {
                      setUpdateLoading(false);
                    }
                  })();
                }}
              >
                {updateLoading ? "Atualizando..." : "Atualizar Stock"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={updateLoading}
                onClick={() => {
                  const parsedId = asNumber(idProduto);
                  const parsedBrand = asNumber(brandId);

                  if (!parsedId || parsedId <= 0 || !Number.isInteger(parsedId)) {
                    openJson(JSON.stringify({ ok: false, message: "idProduto inválido" }, null, 2));
                    return;
                  }

                  if (parsedBrand === null || parsedBrand < 0 || !Number.isInteger(parsedBrand)) {
                    openJson(JSON.stringify({ ok: false, message: "idBrand inválido" }, null, 2));
                    return;
                  }

                  (async () => {
                    setUpdateLoading(true);
                    try {
                      const response = await fetch("/api/producao/redis/catalog/produto/brand", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ idProduto: parsedId, idBrand: parsedBrand }),
                      });
                      const body = await response.json().catch(() => null);
                      openJson(JSON.stringify(body, null, 2));
                    } catch (error) {
                      openJson(
                        JSON.stringify(
                          { ok: false, message: error instanceof Error ? error.message : "Erro ao atualizar Redis" },
                          null,
                          2
                        )
                      );
                    } finally {
                      setUpdateLoading(false);
                    }
                  })();
                }}
              >
                {updateLoading ? "Atualizando..." : "Atualizar Marca"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={updateLoading}
                onClick={() => {
                  const parsedId = asNumber(idProduto);
                  const trimmedName = productName.trim();

                  if (!parsedId || parsedId <= 0 || !Number.isInteger(parsedId)) {
                    openJson(JSON.stringify({ ok: false, message: "idProduto inválido" }, null, 2));
                    return;
                  }

                  if (!trimmedName) {
                    openJson(JSON.stringify({ ok: false, message: "name inválido" }, null, 2));
                    return;
                  }

                  const normalizedSlug = normalizeProductSlug(parsedId, trimmedName, productSlug);

                  (async () => {
                    setUpdateLoading(true);
                    try {
                      const response = await fetch("/api/producao/redis/catalog/produto/name-slug", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ idProduto: parsedId, name: trimmedName, slug: normalizedSlug }),
                      });
                      const body = await response.json().catch(() => null);
                      setProductSlug(normalizedSlug);
                      openJson(JSON.stringify(body, null, 2));
                    } catch (error) {
                      openJson(
                        JSON.stringify(
                          { ok: false, message: error instanceof Error ? error.message : "Erro ao atualizar Redis" },
                          null,
                          2
                        )
                      );
                    } finally {
                      setUpdateLoading(false);
                    }
                  })();
                }}
              >
                {updateLoading ? "Atualizando..." : "Atualizar Name/Slug"}
              </Button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
