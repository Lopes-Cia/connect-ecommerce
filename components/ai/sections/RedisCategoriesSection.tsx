"use client";

import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { slugify } from "@/lib/utils";

type UnknownRecord = Record<string, unknown>;

type CategoriaDoc = {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  image: string;
  order: number;
} & UnknownRecord;

type RedisCrudResponse =
  | { ok: true; key: string; exists?: boolean; removed?: boolean; data?: unknown }
  | { ok: false; message: string };

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? "");
  }
}

function parseJson(text: string): UnknownRecord {
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON deve ser um objeto");
  return parsed as UnknownRecord;
}

function toIntOrZero(value: unknown): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function getString(value: unknown): string {
  return String(value ?? "").trim();
}

function buildTree(items: CategoriaDoc[]) {
  const byParent = new Map<number, CategoriaDoc[]>();
  for (const item of items) {
    const parentId = toIntOrZero(item.parentId);
    const list = byParent.get(parentId) ?? [];
    list.push(item);
    byParent.set(parentId, list);
  }
  for (const [, list] of byParent) {
    list.sort((a, b) => {
      const ao = toIntOrZero(a.order);
      const bo = toIntOrZero(b.order);
      if (ao !== bo) return ao - bo;
      return getString(a.name).localeCompare(getString(b.name));
    });
  }
  return byParent;
}

function JsonTreeNode(props: { label: string; value: unknown; level: number }) {
  const [open, setOpen] = useState(props.level < 1);
  const isObj = props.value && typeof props.value === "object" && !Array.isArray(props.value);
  const isArr = Array.isArray(props.value);

  if (!isObj && !isArr) {
    return (
      <div className="flex items-start gap-2">
        <span className="min-w-24 text-xs font-semibold text-zinc-700">{props.label}</span>
        <span className="text-xs text-zinc-900 break-all">{String(props.value ?? "—")}</span>
      </div>
    );
  }

  const entries = isArr ? (props.value as unknown[]).map((v, i) => [String(i), v] as const) : Object.entries(props.value as UnknownRecord);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-2 py-1 text-left text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
      >
        <span className="truncate">
          {props.label} <span className="text-zinc-500">({isArr ? "array" : "object"})</span>
        </span>
        <span className="text-zinc-500">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="space-y-1 pl-3">
          {entries.map(([k, v]) => (
            <JsonTreeNode key={`${props.label}.${k}`} label={k} value={v} level={props.level + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function RedisCategoriesSection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoriaDoc[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");

  const [jsonValue, setJsonValue] = useState("");
  const [crudLoading, setCrudLoading] = useState(false);
  const [crudError, setCrudError] = useState<string | null>(null);
  const [crudInfo, setCrudInfo] = useState<string>("");

  const categoriesById = useMemo(() => {
    const map = new Map<number, CategoriaDoc>();
    for (const c of categories) map.set(toIntOrZero(c.id), c);
    return map;
  }, [categories]);

  const byParent = useMemo(() => buildTree(categories), [categories]);

  const selected = useMemo(() => {
    if (selectedId === null) return null;
    return categoriesById.get(selectedId) ?? null;
  }, [categoriesById, selectedId]);

  const selectedJsonTreeValue = useMemo(() => {
    if (!selected) return null;
    const record = asRecord(selected);
    return record ?? null;
  }, [selected]);

  async function loadCategories() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setCrudInfo("");

    try {
      const response = await fetch("/api/catalog/categories", { method: "GET", cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok || !Array.isArray(payload)) throw new Error("Erro ao carregar categorias do Redis");

      const parsed = payload
        .map((item) => {
          const r = asRecord(item);
          if (!r) return null;
          const id = toIntOrZero(r.id);
          if (!id && id !== 0) return null;
          return {
            ...r,
            id,
            name: getString(r.name),
            slug: getString(r.slug),
            parentId: toIntOrZero(r.parentId),
            image: getString(r.image),
            order: toIntOrZero(r.order),
          } as CategoriaDoc;
        })
        .filter((v): v is CategoriaDoc => Boolean(v));

      setCategories(parsed);
      setSelectedId((current) => (current === null && parsed.length ? parsed[0].id : current));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function ensureExpandedPath(id: number) {
    const next: Record<number, boolean> = { ...expanded };
    let current = categoriesById.get(id);
    while (current && current.parentId && current.parentId !== 0) {
      next[current.parentId] = true;
      current = categoriesById.get(current.parentId);
    }
    setExpanded(next);
  }

  async function saveSelected() {
    if (!selectedId) return;
    setCrudLoading(true);
    setCrudError(null);
    setCrudInfo("");

    try {
      const doc = parseJson(jsonValue);
      const response = await fetch(`/api/producao/catalog/crud/category/${encodeURIComponent(String(selectedId))}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc }),
      });
      const payload = (await response.json().catch(() => null)) as unknown as RedisCrudResponse | null;
      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload && "message" in payload ? String(payload.message) : "Erro ao salvar categoria");
      }

      setCategories((current) =>
        current.map((c) => (toIntOrZero(c.id) === selectedId ? ({ ...c, ...doc } as CategoriaDoc) : c))
      );
      setCrudInfo("Categoria salva.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro inesperado";
      setCrudError(message);
    } finally {
      setCrudLoading(false);
    }
  }

  async function deleteSelected() {
    if (selectedId === null) return;
    if (selectedId === 0) return;
    setCrudLoading(true);
    setCrudError(null);
    setCrudInfo("");

    try {
      const response = await fetch(`/api/producao/catalog/crud/category/${encodeURIComponent(String(selectedId))}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as unknown as RedisCrudResponse | null;
      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload && "message" in payload ? String(payload.message) : "Erro ao remover categoria");
      }

      setCategories((current) => current.filter((c) => toIntOrZero(c.id) !== selectedId));
      setSelectedId(null);
      setJsonValue("");
      setCrudInfo("Categoria removida.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro inesperado";
      setCrudError(message);
    } finally {
      setCrudLoading(false);
    }
  }

  async function createCategory(parentId: number) {
    const id = toIntOrZero(newId);
    const name = newName.trim();
    if (!id) {
      setCrudError("Informe um ID numérico (maior que 0).");
      return;
    }
    if (!name) {
      setCrudError("Informe um nome.");
      return;
    }
    if (categoriesById.has(id)) {
      setCrudError("Esse ID já existe no Redis.");
      return;
    }

    setCrudLoading(true);
    setCrudError(null);
    setCrudInfo("");

    try {
      const siblings = (byParent.get(parentId) ?? []).map((c) => toIntOrZero(c.order));
      const nextOrder = siblings.length ? Math.max(...siblings) + 1 : 1;

      const doc: CategoriaDoc = {
        id,
        name,
        slug: `/categoria/${slugify(name)}`,
        parentId,
        image: "https://lopesecia.com.br/img/semImagem.png",
        order: nextOrder,
      };

      const response = await fetch(`/api/producao/catalog/crud/category/${encodeURIComponent(String(id))}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc }),
      });
      const payload = (await response.json().catch(() => null)) as unknown as RedisCrudResponse | null;
      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload && "message" in payload ? String(payload.message) : "Erro ao criar categoria");
      }

      setCategories((current) => [...current, doc]);
      setExpanded((current) => ({ ...current, [parentId]: true }));
      setSelectedId(id);
      setJsonValue(stringifyJson(doc));
      setNewId("");
      setNewName("");
      setCrudInfo("Categoria criada.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro inesperado";
      setCrudError(message);
    } finally {
      setCrudLoading(false);
    }
  }

  function selectCategory(id: number) {
    setSelectedId(id);
    const found = categoriesById.get(id);
    if (found) {
      setJsonValue(stringifyJson(found));
      setCrudInfo("");
      setCrudError(null);
      ensureExpandedPath(id);
    }
  }

  function toggleExpand(id: number) {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  }

  function renderNode(node: CategoriaDoc, level: number) {
    const id = toIntOrZero(node.id);
    const children = byParent.get(id) ?? [];
    const isOpen = expanded[id] ?? level < 1;
    const isSelected = selectedId === id;

    return (
      <div key={id}>
        <div
          className={`flex items-center gap-1 rounded-md px-2 py-1 hover:bg-zinc-100 ${
            isSelected ? "bg-zinc-200" : ""
          }`}
          style={{ paddingLeft: `${8 + level * 14}px` }}
        >
          {children.length ? (
            <button
              type="button"
              onClick={() => toggleExpand(id)}
              className="h-6 w-6 shrink-0 rounded-md border border-zinc-200 bg-white text-xs text-zinc-700 hover:bg-zinc-50"
              aria-label={isOpen ? "Recolher" : "Expandir"}
            >
              {isOpen ? "−" : "+"}
            </button>
          ) : (
            <div className="h-6 w-6 shrink-0" />
          )}
          <button
            type="button"
            onClick={() => selectCategory(id)}
            className="min-w-0 flex-1 truncate text-left text-sm font-medium text-zinc-900"
          >
            {getString(node.name) || `Categoria ${id}`}
            <span className="ml-2 text-xs text-zinc-500">#{id}</span>
          </button>
        </div>
        {children.length && isOpen ? <div>{children.map((c) => renderNode(c, level + 1))}</div> : null}
      </div>
    );
  }

  const roots = useMemo(() => (byParent.get(0) ?? []).filter((c) => toIntOrZero(c.id) !== 0), [byParent]);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Categorias (Redis) — CRUD</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="default" onClick={loadCategories} disabled={loading}>
              Carregar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => createCategory(0)}
              disabled={crudLoading || !newId.trim() || !newName.trim()}
            >
              Add raiz
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => createCategory(selected ? toIntOrZero(selected.id) : 0)}
              disabled={crudLoading || !newId.trim() || !newName.trim() || selectedId === null}
            >
              Add filho
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={deleteSelected}
              disabled={crudLoading || selectedId === null || selectedId === 0}
            >
              Remover
            </Button>
            <Button type="button" onClick={saveSelected} disabled={crudLoading || !selectedId || !jsonValue.trim()}>
              Salvar
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="Novo ID (numérico)" />
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome da categoria" />
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Tree</span>
                  <span className="text-xs text-zinc-500">{categories.length ? `${categories.length} itens` : "—"}</span>
                </div>
                <div className="max-h-[420px] overflow-auto">
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-[85%]" />
                      <Skeleton className="h-6 w-[70%]" />
                    </div>
                  ) : roots.length ? (
                    <div className="space-y-0.5">{roots.map((c) => renderNode(c, 0))}</div>
                  ) : (
                    <div className="text-sm text-zinc-600">Nenhuma categoria carregada.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Editor JSON</span>
                  <span className="text-xs text-zinc-500">
                    {selected ? `${getString(selected.name) || "—"} (#${toIntOrZero(selected.id)})` : "—"}
                  </span>
                </div>
                <textarea
                  value={jsonValue}
                  onChange={(e) => setJsonValue(e.target.value)}
                  className="h-[220px] w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-mono text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  placeholder="Selecione uma categoria na tree para editar."
                />
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Tree JSON</span>
                  <span className="text-xs text-zinc-500">visualização</span>
                </div>
                <div className="max-h-[220px] overflow-auto">
                  {selectedJsonTreeValue ? (
                    <JsonTreeNode label="category" value={selectedJsonTreeValue} level={0} />
                  ) : (
                    <div className="text-sm text-zinc-600">Selecione uma categoria para ver a estrutura.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {crudInfo ? (
            <Alert>
              <AlertTitle>OK</AlertTitle>
              <AlertDescription>{crudInfo}</AlertDescription>
            </Alert>
          ) : null}

          {error || crudError ? (
            <Alert variant="destructive">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error ?? crudError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

