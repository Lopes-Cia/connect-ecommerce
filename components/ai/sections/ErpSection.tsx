"use client";

import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { unwrapData, unwrapList } from "@/lib/ai/catalog/unwrap";
import { buildSchemaFromSample, pickSample, type CatalogSchema } from "@/lib/ai/catalog/schema";
import { computeCatalogOverview, type CatalogOverview } from "@/lib/ai/catalog/metrics";
import { executeCatalogQuery, parseCatalogQuerySpec } from "@/lib/ai/catalog/query";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function stringifyJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim()) {
    const asObj = parseJsonObject(value);
    if (asObj) return JSON.stringify(asObj, null, 2);
    return value;
  }
  if (typeof value !== "object") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

export default function ErpSection() {
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonModalValue, setJsonModalValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<unknown[]>([]);
  const [overview, setOverview] = useState<CatalogOverview | null>(null);
  const [schema, setSchema] = useState<CatalogSchema | null>(null);
  const [sample, setSample] = useState<unknown[]>([]);
  const [note, setNote] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const hasCatalogContext = items.length > 0 && Boolean(schema);

  async function loadIntegratedProducts() {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/lopes/produtos-loja", { method: "GET" });
      const payload = (await response.json().catch(() => null)) as unknown;
      const dataOnly = unwrapData(payload);
      const list = unwrapList(payload);
      const nextOverview = computeCatalogOverview(list, 10);
      const nextSample = pickSample(list, 30);
      const nextSchema = buildSchemaFromSample(nextSample);

      setItems(list);
      setOverview(nextOverview);
      setSample(nextSample);
      setSchema(nextSchema);
      setJsonModalValue(stringifyJson(dataOnly) ?? "");

      const noteResponse = await fetch("/api/ai/brand-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Você é um assistente estilo NotebookLM.\n\nGere um resumo curto em tópicos sobre o contexto atual do catálogo (métricas + amostra + schema) e também sobre:\n- Redis e como ele ajuda no catálogo (com base no documento Redis-Catalogo)\n- Estratégia para completar categorias (use a pesquisa de categorias como proposta)\n- Estratégia para completar marcas extraindo das informações do produto\n\nRegras:\n- Formato em tópicos curtos (Notebook style)\n- Não invente números; use as métricas fornecidas\n- Termine com uma seção 'Você pode pedir:' com 3-5 sugestões (ex.: \"quero saber mais de categorias\")\n",
          catalogContext: {
            overview: nextOverview,
            schema: nextSchema,
            sample: nextSample,
          },
        }),
      });

      const notePayload = (await noteResponse.json().catch(() => null)) as unknown;
      const noteData = parseJsonObject(notePayload);
      if (noteResponse.ok) {
        setNote(String(noteData?.answer ?? "").trim());
      } else {
        setNote(String(noteData?.error ?? "Erro ao gerar visão geral.") || "Erro ao gerar visão geral.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao buscar produtos integrados.";
      setNote(message);
      setItems([]);
      setOverview(null);
      setSchema(null);
      setSample([]);
      setJsonModalValue(stringifyJson({ success: false, message }) ?? "");
    } finally {
      setLoading(false);
    }
  }

  async function sendChatMessage() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    setChatMessages((current) => [...current, { role: "user", content: text }]);
    setChatInput("");

    if (!items.length || !schema) {
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: "Carregue os produtos integrados para eu usar como contexto." },
      ]);
      return;
    }

    setChatLoading(true);
    try {
      const queryResponse = await fetch("/api/ai/catalog-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, schema, sample }),
      });

      const queryPayload = (await queryResponse.json().catch(() => null)) as unknown;
      const queryData = parseJsonObject(queryPayload);
      const specRaw = queryData?.spec;
      const parsed = parseCatalogQuerySpec(specRaw);

      const computed = parsed.ok
        ? executeCatalogQuery(items, parsed.spec)
        : { intent: "unknown", error: parsed.error, rawSpec: specRaw };

      const answerResponse = await fetch("/api/ai/brand-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Pergunta do usuário:\n${text}\n\nResultado calculado (catálogo completo):\n${JSON.stringify(computed, null, 2)}\n\nFormate uma resposta objetiva em português do Brasil, com números e ressalvas quando faltar dado.`,
          catalogContext: {
            overview,
            schema,
            sample,
          },
        }),
      });

      const answerPayload = (await answerResponse.json().catch(() => null)) as unknown;
      const answerData = parseJsonObject(answerPayload);
      if (!answerResponse.ok) {
        throw new Error(String(answerData?.error ?? "Erro ao consultar assistente IA."));
      }
      const answerText = String(answerData?.answer ?? "").trim() || "Sem resposta da IA.";
      setChatMessages((current) => [...current, { role: "assistant", content: answerText }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao consultar assistente IA.";
      setChatMessages((current) => [...current, { role: "assistant", content: message }]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">ERP</p>
            <p className="text-sm font-medium text-zinc-900">Produtos integrados</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => void loadIntegratedProducts()}
              disabled={loading}
              className="shrink-0 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800"
            >
              {loading ? "Carregando..." : "Ver produtos integrados"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!jsonModalValue.trim()}
              onClick={() => setIsJsonModalOpen(true)}
            >
              Abrir RAW (data)
            </Button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 gap-4 md:grid-cols-[420px_1fr]">
        <Card className="order-2 min-h-0 rounded-2xl border-zinc-200 bg-white md:order-none">
          <CardHeader className="gap-1 border-b border-zinc-200 pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm text-zinc-900">Visão geral</CardTitle>
              <p className="text-xs text-zinc-500">{overview ? `${overview.total} produtos` : "—"}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview ? (
              <div className="space-y-2 text-sm text-zinc-800">
                <div className="flex items-center justify-between">
                  <span>Com estoque</span>
                  <span className="font-medium">{overview.inStock}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sem estoque</span>
                  <span className="font-medium">{overview.outOfStock}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Com imagem</span>
                  <span className="font-medium">{overview.withImage}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sem imagem</span>
                  <span className="font-medium">{overview.withoutImage}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sem categoria</span>
                  <span className="font-medium">{overview.missingCategory}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sem marca</span>
                  <span className="font-medium">{overview.missingBrand}</span>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700">
                  <p className="font-semibold text-zinc-900">Preço</p>
                  <p>Min: {overview.price.min ?? "—"}</p>
                  <p>Mediana: {overview.price.median ?? "—"}</p>
                  <p>Max: {overview.price.max ?? "—"}</p>
                </div>

                {overview.topCategories.length ? (
                  <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700">
                    <p className="font-semibold text-zinc-900">Top categorias</p>
                    <div className="mt-2 space-y-1">
                      {overview.topCategories.slice(0, 5).map((item) => (
                        <div key={`cat-${item.key}`} className="flex items-center justify-between gap-2">
                          <span className="truncate">{item.key}</span>
                          <span className="font-medium text-zinc-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {overview.topBrands.length ? (
                  <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700">
                    <p className="font-semibold text-zinc-900">Top marcas</p>
                    <div className="mt-2 space-y-1">
                      {overview.topBrands.slice(0, 5).map((item) => (
                        <div key={`brand-${item.key}`} className="flex items-center justify-between gap-2">
                          <span className="truncate">{item.key}</span>
                          <span className="font-medium text-zinc-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : (
              <Alert className="border-zinc-200 bg-zinc-50">
                <AlertTitle>Catálogo não carregado</AlertTitle>
                <AlertDescription>
                  Clique em “Ver produtos integrados” para carregar o contexto (métricas, schema e amostra).
                </AlertDescription>
              </Alert>
            )}

            <div className="min-h-0">
              <p className="text-sm font-semibold text-zinc-900">Nota da IA</p>
              {loading && !note ? (
                <div className="mt-2 space-y-2 rounded-xl bg-zinc-50 p-3">
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-4/6" />
                  <Skeleton className="h-3 w-3/6" />
                </div>
              ) : (
                <pre className="mt-2 max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-xs text-zinc-800 md:max-h-[52vh]">
                  {note || "—"}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="order-1 min-h-0 overflow-hidden rounded-2xl border-zinc-200 bg-white md:order-none">
          <CardHeader className="gap-1 border-b border-zinc-200 pb-4">
            <CardTitle className="text-sm text-zinc-900">Chat</CardTitle>
            <p className="text-xs text-zinc-500">Pergunte usando o contexto do catálogo carregado</p>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto text-sm">
              {!hasCatalogContext ? (
                <Alert className="border-zinc-200 bg-zinc-50">
                  <AlertTitle>Preciso do contexto do catálogo</AlertTitle>
                  <AlertDescription>
                    Carregue os produtos integrados para eu conseguir responder com números e filtros reais.
                  </AlertDescription>
                </Alert>
              ) : null}

              {chatMessages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-semibold text-zinc-900">Sugestões rápidas</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => setChatInput("Quantos produtos estão sem estoque?")}
                    >
                      Quantos produtos estão sem estoque?
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => setChatInput("Liste os 10 produtos mais caros.")}
                    >
                      Liste os 10 produtos mais caros.
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => setChatInput("Quais campos de categoria/marca estão mais inconsistentes?")}
                    >
                      Onde categoria/marca falham mais?
                    </Button>
                  </div>
                </div>
              ) : null}

              {chatMessages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={
                    item.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl bg-zinc-950 px-3 py-2 text-white"
                      : "mr-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-zinc-100 px-3 py-2 text-zinc-800"
                  }
                >
                  {item.content}
                </div>
              ))}

              {chatLoading ? (
                <div className="mr-auto rounded-2xl bg-zinc-100 px-3 py-2 text-zinc-500">Analisando...</div>
              ) : null}
            </div>

            <div className="border-t border-zinc-200 pt-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void sendChatMessage();
                    }
                  }}
                  placeholder="Pergunte sobre o catálogo (ex.: quantos estão sem estoque?)"
                  className="h-10 rounded-xl border-zinc-300 focus-visible:border-zinc-900 focus-visible:ring-zinc-900/20"
                />

                <Button
                  type="button"
                  onClick={() => void sendChatMessage()}
                  disabled={chatLoading || !chatInput.trim()}
                  className="h-10 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800"
                >
                  Enviar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isJsonModalOpen}
        onOpenChange={(open) => {
          setIsJsonModalOpen(open);
          if (!open) setJsonModalValue("");
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>RAW: produtos integrados</DialogTitle>
          </DialogHeader>

          <pre className="max-h-[60vh] overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">
            {jsonModalValue || "—"}
          </pre>

          <DialogClose asChild>
            <Button variant="outline">Fechar</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
