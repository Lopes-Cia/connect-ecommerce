"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type RecursosSubTab = "brands";

type BrandRow = {
  id: number;
  nome: string;
  slug: string;
  image: string;
};

type CatalogProductRow = {
  id: number;
  name: string;
  sku?: string;
  brandId?: number;
  brandNome?: string;
};

type EditorMode = "none" | "new" | "edit";

const DEFAULT_BRAND_IMAGE = "https://lopesecia.com.br/img/semImagem.png";

type UnknownRecord = Record<string, unknown>;
type ImageAiOption = { url: string };

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function sanitizeUrl(value: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/^`+|`+$/g, "").replace(/^"+|"+$/g, "").trim();
}

function isAllowedImageHost(url: string): boolean {
  if (!url.trim()) return false;
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return (
      host === "lopesecia.com.br" ||
      host === "gp.lopesecia.com.br" ||
      host === "www.catalogoambev.com.br" ||
      host === "app-connect.lopesecia.com.br" ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

function getBrandImageSrc(value: string): string {
  const sanitized = sanitizeUrl(value);
  if (!sanitized) return DEFAULT_BRAND_IMAGE;
  if (!isAllowedImageHost(sanitized)) return DEFAULT_BRAND_IMAGE;
  return sanitized;
}

function toBrandRow(value: unknown): BrandRow | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = asNumber(record.id);
  if (!id || id <= 0 || !Number.isInteger(id)) return null;

  const nome = asString(record.nome) || asString(record.name) || "-";
  const slug = asString(record.slug);
  const image = sanitizeUrl(asString(record.image));

  return { id, nome, slug, image };
}

function toCatalogProductRow(value: unknown): CatalogProductRow | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asNumber(record.id);
  if (!id || id <= 0 || !Number.isInteger(id)) return null;
  const name = asString(record.name) || "-";
  const sku = asString(record.sku);
  const brandRecord = asRecord(record.brand);
  const brandId = asNumber(brandRecord?.id) ?? undefined;
  const brandNome = asString(brandRecord?.nome) || asString(brandRecord?.name) || undefined;
  return { id, name, sku: sku || undefined, brandId, brandNome };
}

export default function RecursosView({ activeSubTab }: { activeSubTab: RecursosSubTab }) {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("none");
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [imageAiLoading, setImageAiLoading] = useState(false);
  const [imageAiOptions, setImageAiOptions] = useState<ImageAiOption[]>([]);
  const [formId, setFormId] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formImage, setFormImage] = useState("");
  const [assocOpen, setAssocOpen] = useState(false);
  const [assocQuery, setAssocQuery] = useState("");
  const [assocAppliedQuery, setAssocAppliedQuery] = useState("");
  const [assocPage, setAssocPage] = useState(1);
  const [assocLoading, setAssocLoading] = useState(false);
  const [assocError, setAssocError] = useState<string | null>(null);
  const [assocItems, setAssocItems] = useState<CatalogProductRow[]>([]);
  const [assocTotal, setAssocTotal] = useState(0);
  const [assocSelected, setAssocSelected] = useState<number[]>([]);
  const [assocApplying, setAssocApplying] = useState(false);
  const [assocResult, setAssocResult] = useState<string | null>(null);

  const loadBrands = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/catalog/produtos/brands", { signal });
      const body = await response.json().catch(() => null);

      const payload = asRecord(body);
      const data = payload?.success === true ? payload.data : null;
      const rows = Array.isArray(data) ? data.map(toBrandRow).filter(Boolean) : [];
      setBrands(rows as BrandRow[]);
      if (payload?.success !== true) setError(asString(payload?.message) || "Falha ao carregar brands.");
    } catch (e) {
      if (signal?.aborted) return;
      setBrands([]);
      setError(e instanceof Error ? e.message : "Erro ao carregar brands.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (activeSubTab === "brands") void loadBrands(controller.signal);
    return () => controller.abort();
  }, [activeSubTab]);

  const sortedBrands = useMemo(() => {
    return brands.toSorted((a, b) => a.id - b.id);
  }, [brands]);

  const showEditor = editorMode !== "none";
  const currentBrandId = useMemo(() => {
    const parsed = Number.parseInt(formId, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }, [formId]);

  const assocPageSize = 20;
  const assocTotalPages = useMemo(() => {
    if (assocTotal === 0) return 0;
    return Math.ceil(assocTotal / assocPageSize);
  }, [assocTotal]);

  const loadAssocProducts = async (input: { q: string; page: number; signal?: AbortSignal }) => {
    setAssocLoading(true);
    setAssocError(null);
    setAssocResult(null);
    try {
      const usp = new URLSearchParams();
      usp.set("page", String(input.page));
      usp.set("pageSize", String(assocPageSize));
      usp.set("sort", "rank:desc");
      if (input.q.trim()) usp.set("q", input.q.trim());

      const response = await fetch(`/api/catalog/products?${usp.toString()}`, { signal: input.signal });
      const body = await response.json().catch(() => null);
      const payload = asRecord(body);
      const items = Array.isArray(payload?.items) ? payload?.items : [];
      const parsed = items.map(toCatalogProductRow).filter(Boolean) as CatalogProductRow[];

      setAssocItems(parsed);
      setAssocTotal(asNumber(payload?.total) ?? 0);
      if (!response.ok) setAssocError(asString(payload?.message) || "Falha ao carregar produtos.");
    } catch (e) {
      if (input.signal?.aborted) return;
      setAssocItems([]);
      setAssocTotal(0);
      setAssocError(e instanceof Error ? e.message : "Erro ao carregar produtos.");
    } finally {
      if (!input.signal?.aborted) setAssocLoading(false);
    }
  };

  useEffect(() => {
    if (!assocOpen) return;
    const controller = new AbortController();
    void loadAssocProducts({ q: assocAppliedQuery, page: assocPage, signal: controller.signal });
    return () => controller.abort();
  }, [assocOpen, assocPage, assocAppliedQuery]);

  return (
    <div className="flex-1 overflow-y-auto p-4 text-sm">
      {activeSubTab === "brands" ? (
        <div className={showEditor ? "grid grid-cols-1 gap-3 lg:grid-cols-[1fr_360px]" : "grid grid-cols-1 gap-3"}>
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Brands</p>
                <p className="mt-1 text-xs text-zinc-600">
                  {loading ? "Carregando..." : `${sortedBrands.length} registro(s) no Redis.`}
                </p>
                {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
                onClick={() => {
                  setEditorError(null);
                  setImageAiLoading(false);
                  setImageAiOptions([]);
                  setEditorMode("new");
                  setFormId("");
                  setFormNome("");
                  setFormSlug("");
                  setFormImage("");
                }}
                aria-label="Nova brand"
                title="Nova brand"
              >
                <Plus />
              </Button>
            </div>

            <div className="mt-3 rounded-xl border border-zinc-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">id</TableHead>
                    <TableHead className="w-[70px]">image</TableHead>
                    <TableHead>nome</TableHead>
                    <TableHead>slug</TableHead>
                    <TableHead className="text-right">ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBrands.length ? (
                    sortedBrands.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell className="font-mono text-xs">{brand.id}</TableCell>
                        <TableCell>
                          <Image
                            src={getBrandImageSrc(brand.image)}
                            alt={brand.nome}
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded-md border border-zinc-200 bg-white object-contain"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{brand.nome}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-xs text-zinc-700">{brand.slug || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              className="border-blue-600 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                              onClick={() => {
                                setEditorError(null);
                                setImageAiLoading(false);
                                setImageAiOptions([]);
                                setEditorMode("edit");
                                setFormId(String(brand.id));
                                setFormNome(brand.nome);
                                setFormSlug(brand.slug);
                                setFormImage(brand.image);
                              }}
                              aria-label={`Editar brand ${brand.id}`}
                              title="Editar"
                            >
                              <Pencil />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="destructive"
                              onClick={() => {
                                if (!confirm(`Excluir brand ${brand.id}?`)) return;
                                (async () => {
                                  setEditorLoading(true);
                                  setEditorError(null);
                                  try {
                                    const response = await fetch(`/api/dev/redis/catalog/brand/by-id/${brand.id}`, {
                                      method: "DELETE",
                                    });
                                    const body = await response.json().catch(() => null);
                                    const ok = Boolean(asRecord(body)?.ok);
                                    if (!response.ok || !ok) {
                                      setEditorError(asString(asRecord(body)?.message) || "Falha ao excluir.");
                                      return;
                                    }
                                    if (editorMode !== "none" && formId === String(brand.id)) setEditorMode("none");
                                    await loadBrands();
                                  } catch (e) {
                                    setEditorError(e instanceof Error ? e.message : "Erro ao excluir.");
                                  } finally {
                                    setEditorLoading(false);
                                  }
                                })();
                              }}
                              aria-label={`Excluir brand ${brand.id}`}
                              title="Excluir"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-xs text-zinc-600">
                        {loading ? "Carregando..." : "Nenhuma brand encontrada."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {showEditor ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{editorMode === "new" ? "Novo" : "Editar"}</p>
                  <p className="mt-1 text-xs text-zinc-600">Salva direto no Redis (brand).</p>
                  {editorError ? <p className="mt-1 text-xs text-red-700">{editorError}</p> : null}
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditorMode("none")}>
                  Fechar
                </Button>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs font-medium text-zinc-700">id</p>
                  <Input
                    value={formId}
                    disabled={editorMode === "edit"}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="Ex.: 1"
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-700">nome</p>
                  <Input value={formNome} onChange={(e) => setFormNome(e.target.value)} className="mt-1 h-9" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-700">slug</p>
                  <Input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} className="mt-1 h-9" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-700">image</p>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input value={formImage} onChange={(e) => setFormImage(e.target.value)} className="h-9" />
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        disabled={editorLoading || imageAiLoading || !formNome.trim()}
                        onClick={() => {
                          const nome = formNome.trim();
                          if (!nome) {
                            setEditorError("nome é obrigatório");
                            return;
                          }

                          (async () => {
                            setImageAiLoading(true);
                            setEditorError(null);
                            setImageAiOptions([]);
                            try {
                              const prompt = `/img logo "${nome}" --count 3`;
                              const response = await fetch("/api/ai/brand-assistant", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ message: prompt, productContext: {}, catalogContext: null }),
                              });
                              const body = await response.json().catch(() => null);
                              const answer = asString(asRecord(body)?.answer);
                              if (!response.ok || !answer) {
                                setEditorError(answer || "Falha ao buscar imagem.");
                                return;
                              }

                              const start = answer.indexOf("{");
                              const end = answer.lastIndexOf("}");
                              if (start === -1 || end === -1 || end <= start) {
                                setEditorError(answer || "Resposta inválida ao buscar imagem.");
                                return;
                              }

                              const parsed = JSON.parse(answer.slice(start, end + 1)) as unknown;
                              const items = Array.isArray(asRecord(parsed)?.items) ? (asRecord(parsed)?.items as unknown[]) : [];
                              const candidates = items
                                .filter((item) => asRecord(item)?.ok === true)
                                .map((item) => asString(asRecord(item)?.url) || asString(asRecord(item)?.savedPath))
                                .filter(Boolean)
                                .slice(0, 3);

                              if (!candidates.length) {
                                setEditorError("Nenhuma imagem encontrada.");
                                return;
                              }

                              const published: ImageAiOption[] = [];
                              for (const candidate of candidates) {
                                const isWindowsPath = /^[a-zA-Z]:\\/.test(candidate);
                                if (!isWindowsPath) {
                                  published.push({ url: candidate });
                                  continue;
                                }

                                const pubResponse = await fetch("/api/dev/assets/publish-image", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ absPath: candidate }),
                                });
                                const pubBody = await pubResponse.json().catch(() => null);
                                const pubUrl = asString(asRecord(pubBody)?.url);
                                const pubOk = Boolean(asRecord(pubBody)?.ok);
                                if (!pubResponse.ok || !pubOk || !pubUrl) continue;
                                published.push({ url: pubUrl });
                              }

                              if (!published.length) {
                                setEditorError("Nenhuma imagem encontrada.");
                                return;
                              }

                              setImageAiOptions(published);
                            } catch (e) {
                              setEditorError(e instanceof Error ? e.message : "Erro ao buscar imagem.");
                            } finally {
                              setImageAiLoading(false);
                            }
                          })();
                        }}
                        aria-label="IA: buscar logo"
                        title="IA: buscar logo"
                      >
                        <Sparkles />
                      </Button>
                    </div>

                    <div className="rounded-md border border-zinc-200 bg-white p-2">
                      <div className="flex items-center gap-3">
                        <Image
                          src={getBrandImageSrc(formImage)}
                          alt={formNome.trim() || "brand"}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-md border border-zinc-200 bg-white object-contain"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-700">
                            {imageAiLoading ? "Buscando imagens..." : imageAiOptions.length ? "Escolha uma opção" : "Preview"}
                          </p>
                        </div>
                      </div>

                      {imageAiOptions.length ? (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {imageAiOptions.map((opt) => (
                            <button
                              key={opt.url}
                              type="button"
                              className="flex items-center justify-center rounded-md border border-zinc-200 bg-white p-1 hover:bg-zinc-50"
                              onClick={() => {
                                setFormImage(opt.url);
                                setImageAiOptions([]);
                              }}
                              title="Usar esta imagem"
                            >
                              <Image
                                src={getBrandImageSrc(opt.url)}
                                alt={formNome.trim() || "brand"}
                                width={48}
                                height={48}
                                className="h-12 w-12 object-contain"
                              />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  {editorMode === "edit" && currentBrandId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={editorLoading}
                      onClick={() => {
                        setAssocError(null);
                        setAssocResult(null);
                        setAssocSelected([]);
                        const defaultQ = formNome.trim();
                        setAssocQuery(defaultQ);
                        setAssocAppliedQuery(defaultQ);
                        setAssocPage(1);
                        setAssocOpen(true);
                      }}
                    >
                      Associar produtos
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditorMode("none");
                      setEditorError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={editorLoading}
                    onClick={() => {
                      const id = Number.parseInt(formId, 10);
                      if (!Number.isInteger(id) || id <= 0) {
                        setEditorError("id inválido");
                        return;
                      }
                      if (!formNome.trim()) {
                        setEditorError("nome é obrigatório");
                        return;
                      }

                      (async () => {
                        setEditorLoading(true);
                        setEditorError(null);
                        try {
                          const response = await fetch(`/api/dev/redis/catalog/brand/by-id/${id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              nome: formNome,
                              slug: formSlug,
                              image: formImage,
                            }),
                          });
                          const body = await response.json().catch(() => null);
                          const ok = Boolean(asRecord(body)?.ok);
                          if (!response.ok || !ok) {
                            setEditorError(asString(asRecord(body)?.message) || "Falha ao salvar.");
                            return;
                          }
                          setEditorMode("none");
                          await loadBrands();
                        } catch (e) {
                          setEditorError(e instanceof Error ? e.message : "Erro ao salvar.");
                        } finally {
                          setEditorLoading(false);
                        }
                      })();
                    }}
                  >
                    {editorLoading ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={assocOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAssocOpen(false);
            setAssocApplying(false);
            setAssocLoading(false);
            setAssocError(null);
            setAssocResult(null);
            setAssocItems([]);
            setAssocTotal(0);
            setAssocSelected([]);
          } else {
            setAssocOpen(true);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-h-[85vh] overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Associar produtos à brand {currentBrandId ?? "-"}</DialogTitle>
          </DialogHeader>

          {assocError ? <p className="text-xs text-red-700">{assocError}</p> : null}
          {assocResult ? <p className="text-xs text-green-700">{assocResult}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={assocQuery}
              onChange={(e) => setAssocQuery(e.target.value)}
              placeholder="Buscar por nome..."
              className="h-9 flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={assocLoading || assocApplying}
              onClick={() => {
                setAssocPage(1);
                if (!assocOpen) return;
                setAssocAppliedQuery(assocQuery);
              }}
            >
              Buscar
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <div className="max-h-[50vh] overflow-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[46px]">
                      <input
                        type="checkbox"
                        className="block h-4 w-4"
                        disabled={assocApplying || !assocItems.length}
                        checked={assocItems.length > 0 && assocItems.every((p) => assocSelected.includes(p.id))}
                        onChange={(e) => {
                          const next = e.target.checked;
                          if (next) {
                            setAssocSelected((prev) => {
                              const merged = new Set(prev);
                              for (const p of assocItems) merged.add(p.id);
                              return Array.from(merged);
                            });
                            return;
                          }
                          setAssocSelected((prev) => {
                            const idsOnPage = new Set(assocItems.map((p) => p.id));
                            return prev.filter((id) => !idsOnPage.has(id));
                          });
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-[90px]">id</TableHead>
                    <TableHead>nome</TableHead>
                    <TableHead className="hidden w-[110px] md:table-cell">sku</TableHead>
                    <TableHead className="hidden w-[140px] sm:table-cell">status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assocItems.length ? (
                    assocItems.map((p) => {
                      const checked = assocSelected.includes(p.id);
                      const status =
                        typeof p.brandId === "number"
                          ? p.brandId === currentBrandId
                            ? "já nesta brand"
                            : `atual: ${p.brandNome ?? p.brandId}`
                          : "sem brand";
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="align-middle">
                            <input
                              type="checkbox"
                              className="block h-4 w-4"
                              disabled={assocApplying}
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked;
                                setAssocSelected((prev) => {
                                  if (next) return prev.includes(p.id) ? prev : [...prev, p.id];
                                  return prev.filter((id) => id !== p.id);
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{p.id}</TableCell>
                          <TableCell className="max-w-[420px] truncate font-medium">{p.name}</TableCell>
                          <TableCell className="hidden font-mono text-xs md:table-cell">{p.sku || "—"}</TableCell>
                          <TableCell className="hidden text-xs text-zinc-700 sm:table-cell">{status}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-xs text-zinc-600">
                        {assocLoading ? "Carregando..." : "Nenhum produto encontrado."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={assocLoading || assocApplying || assocPage <= 1}
                onClick={() => setAssocPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={assocLoading || assocApplying || assocTotalPages === 0 || assocPage >= assocTotalPages}
                onClick={() => setAssocPage((p) => p + 1)}
              >
                Próxima
              </Button>
              <p className="text-xs text-zinc-600">
                Página {assocTotalPages ? assocPage : 0} de {assocTotalPages}
              </p>
              <p className="text-xs text-zinc-600">Selecionados: {assocSelected.length}</p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={assocApplying}
                onClick={() => setAssocOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto"
                disabled={assocApplying || !assocSelected.length || !currentBrandId}
                onClick={() => {
                  if (!currentBrandId) return;
                  const ids = assocSelected.slice();
                  (async () => {
                    setAssocApplying(true);
                    setAssocError(null);
                    setAssocResult(null);
                    let okCount = 0;
                    try {
                      for (const idProduto of ids) {
                        const response = await fetch("/api/dev/redis/catalog/produto/brand", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ idProduto, idBrand: currentBrandId }),
                        });
                        const body = await response.json().catch(() => null);
                        const ok = Boolean(asRecord(body)?.ok);
                        if (!response.ok || !ok) {
                          setAssocError(asString(asRecord(body)?.message) || `Falha ao associar produto ${idProduto}.`);
                          return;
                        }
                        okCount += 1;
                      }

                      setAssocSelected([]);
                      setAssocResult(`${okCount} produto(s) associado(s).`);
                      const controller = new AbortController();
                      void loadAssocProducts({ q: assocAppliedQuery, page: assocPage, signal: controller.signal });
                    } catch (e) {
                      setAssocError(e instanceof Error ? e.message : "Erro ao associar produtos.");
                    } finally {
                      setAssocApplying(false);
                    }
                  })();
                }}
              >
                {assocApplying ? "Vinculando..." : "Vincular selecionados"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
