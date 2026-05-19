"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type RecursosSubTab = "brands";

type BrandRow = {
  id: number;
  nome: string;
  slug: string;
  image: string;
};

type EditorMode = "none" | "new" | "edit";

const DEFAULT_BRAND_IMAGE = "https://lopesecia.com.br/img/semImagem.png";

type UnknownRecord = Record<string, unknown>;

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

export default function RecursosView({ activeSubTab }: { activeSubTab: RecursosSubTab }) {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("none");
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [formId, setFormId] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formImage, setFormImage] = useState("");

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
                  <Input value={formImage} onChange={(e) => setFormImage(e.target.value)} className="mt-1 h-9" />
                </div>

                <div className="flex items-center justify-end gap-2">
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
    </div>
  );
}
