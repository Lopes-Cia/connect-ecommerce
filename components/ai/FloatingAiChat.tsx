"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, FileText, MessageSquare, Sparkles, Tag } from "lucide-react";
import JsonView from "@uiw/react-json-view";

import { useControlStore } from "@/stores/control-store";
import ChatView from "@/components/ai/views/ChatView";
import ContextoView from "@/components/ai/views/ContextoView";
import RecursosView, { type RecursosSubTab } from "@/components/ai/views/RecursosView";
import { Button } from "@/components/ui/button";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ActiveTab = "chat" | "contexto" | "recursos";

type ProductContext = {
  url: string;
  title: string;
  productName: string;
  productSlug: string;
  pageText: string;
  imageAltTexts: string[];
  imageUrls: string[];
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getProductSlugFromUrl() {
  if (typeof window === "undefined") return "";

  const pathname = window.location.pathname;
  const match = pathname.match(/\/produtos\/([^/?#]+)/);

  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function getProductContext(): ProductContext {
  if (typeof window === "undefined") {
    return {
      url: "",
      title: "",
      productName: "",
      productSlug: "",
      pageText: "",
      imageAltTexts: [],
      imageUrls: [],
    };
  }

  const pageRoot = document.querySelector("main") ?? document.body;
  const pageText = normalizeText(pageRoot.innerText ?? "").slice(0, 4000);

  const images = Array.from(pageRoot.querySelectorAll("img"));
  const imageAltTexts = images
    .map((image) => image.getAttribute("alt") ?? "")
    .map(normalizeText)
    .filter(Boolean)
    .slice(0, 8);

  const imageUrls = images
    .map((image) => image.currentSrc || image.src || "")
    .filter(Boolean)
    .slice(0, 4);

  return {
    url: window.location.href,
    title: document.title,
    productName: document.querySelector("h1")?.textContent?.trim() ?? "",
    productSlug: getProductSlugFromUrl(),
    pageText,
    imageAltTexts,
    imageUrls,
  };
}

export default function FloatingAiChat() {
  const useIaStore = useControlStore((s) => s.IASTORE);
  const aiChatEnabled = useIaStore((s) => s.aiChatEnabled);
  const contratoRaw = useIaStore((s) => s.contratoRaw);
  const contratoView = useIaStore((s) => s.contratoView);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("contexto");
  const [recursosExpanded, setRecursosExpanded] = useState(false);
  const [recursosSubTab, setRecursosSubTab] = useState<RecursosSubTab>("brands");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonValue, setJsonValue] = useState("");
  const [syncRawAction, setSyncRawAction] = useState<null | (() => Promise<void>)>(null);
  const [syncRawLoading, setSyncRawLoading] = useState(false);

  const jsonParsedValue = useMemo(() => {
    if (!jsonValue.trim()) return null;
    try {
      return JSON.parse(jsonValue) as unknown;
    } catch {
      return null;
    }
  }, [jsonValue]);

  async function copyText(value: string) {
    try {
      if (!value.trim()) return;
      await navigator.clipboard.writeText(value);
    } catch {
    }
  }

  function getMenuButtonClass(active: boolean) {
    return `w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
      active ? "bg-zinc-950 text-white" : "text-zinc-800 hover:bg-zinc-200"
    }`;
  }

  useEffect(() => {
    if (!open) {
      setJsonOpen(false);
      setJsonValue("");
      setSyncRawAction(null);
    }
  }, [open]);

  useEffect(() => {
    if (activeTab !== "contexto") {
      setJsonOpen(false);
      setJsonValue("");
      setSyncRawAction(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "recursos") setRecursosExpanded(true);
  }, [activeTab]);

  if (!aiChatEnabled) return null;

  async function sendMessage(customMessage?: string) {
    const text = (customMessage ?? message).trim();

    if (!text || loading) return;

    const currentProductContext = getProductContext();

    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        role: "user",
        content: text,
      },
    ];

    setMessages(nextMessages);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/brand-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          productContext: currentProductContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Erro ao consultar assistente IA.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer ?? "Sem resposta da IA.",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Erro ao consultar assistente IA.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          role="presentation"
          onClick={() => setOpen(false)}
        />
      ) : null}
      {open ? (
        <div className="fixed left-3 right-3 top-[30px] bottom-[30px] z-40 flex flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl md:left-auto md:right-5 md:w-[80vw] md:max-w-none">
          <div className="flex items-center justify-between bg-zinc-950 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Assistente IA</p>
              <p className="text-xs text-zinc-300">Copiloto do Ecommerce</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-2 py-1 text-sm hover:bg-white/10"
                aria-label="Fechar assistente IA"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="w-44 shrink-0 border-r border-zinc-200 bg-zinc-50 p-3">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("contexto")}
                  className={getMenuButtonClass(activeTab === "contexto")}
                >
                  <span className="flex items-center gap-2">
                    <FileText size={18} className={activeTab === "contexto" ? "text-white" : "text-zinc-700"} />
                    <span>Contexto</span>
                  </span>
                </button>

                <div className="space-y-1">
                  <button
                    type="button"
                    className={getMenuButtonClass(activeTab === "recursos")}
                    onClick={() => {
                      if (activeTab !== "recursos") {
                        setActiveTab("recursos");
                        setRecursosExpanded(true);
                        return;
                      }
                      setRecursosExpanded((current) => !current);
                    }}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Sparkles size={18} className={activeTab === "recursos" ? "text-white" : "text-zinc-700"} />
                        <span>Recursos</span>
                      </span>
                      <ChevronDown
                        size={16}
                        className={`transition ${recursosExpanded ? "rotate-180" : ""} ${
                          activeTab === "recursos" ? "text-white" : "text-zinc-700"
                        }`}
                      />
                    </span>
                  </button>

                  {recursosExpanded ? (
                    <button
                      type="button"
                      className={`w-full rounded-xl py-2 pl-8 pr-3 text-left text-xs font-semibold transition ${
                        activeTab === "recursos" && recursosSubTab === "brands"
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-800 hover:bg-zinc-200"
                      }`}
                      onClick={() => {
                        setActiveTab("recursos");
                        setRecursosExpanded(true);
                        setRecursosSubTab("brands");
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Tag
                          size={16}
                          className={
                            activeTab === "recursos" && recursosSubTab === "brands" ? "text-white" : "text-zinc-700"
                          }
                        />
                        <span>Brands</span>
                      </span>
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={getMenuButtonClass(activeTab === "chat")}
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare size={18} className={activeTab === "chat" ? "text-white" : "text-zinc-700"} />
                    <span>Chat</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              {activeTab === "chat" ? (
                <ChatView
                  messages={messages}
                  loading={loading}
                  message={message}
                  setMessage={setMessage}
                  sendMessage={sendMessage}
                  contratoRaw={contratoRaw}
                />
              ) : activeTab === "contexto" ? (
                <ContextoView
                  contratoRaw={contratoRaw}
                  contratoView={contratoView}
                  setSyncRawAction={setSyncRawAction}
                  openJson={(json) => {
                    setJsonValue(json);
                    setJsonOpen(true);
                  }}
                />
              ) : (
                <RecursosView activeSubTab={recursosSubTab} />
              )}
            </div>

            {jsonOpen ? (
              <div className="hidden h-full w-[360px] shrink-0 flex-col border-l border-zinc-200 bg-white md:flex">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-900">JSON</p>
                  <button
                    type="button"
                    onClick={() => {
                      setJsonOpen(false);
                      setJsonValue("");
                    }}
                    className="rounded-full px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
                    aria-label="Fechar JSON"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                  <div className="min-h-0 flex-1 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs font-mono text-zinc-900">
                    <div className="h-full overflow-auto">
                      {jsonParsedValue ? (
                        <JsonView value={jsonParsedValue} displayDataTypes={false} />
                      ) : (
                        <pre className="whitespace-pre-wrap break-words">{jsonValue || "—"}</pre>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {syncRawAction ? (
                      <Button
                        disabled={syncRawLoading}
                        size="sm"
                        onClick={() => {
                          if (!syncRawAction) return;
                          (async () => {
                            setSyncRawLoading(true);
                            try {
                              await syncRawAction();
                            } finally {
                              setSyncRawLoading(false);
                            }
                          })();
                        }}
                      >
                        {syncRawLoading ? "Sincronizando..." : "Sincronizar RAW > REDIS"}
                      </Button>
                    ) : null}
                    <Button variant="outline" disabled={!jsonValue.trim()} onClick={() => void copyText(jsonValue)}>
                      Copiar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setJsonOpen(false);
                        setJsonValue("");
                      }}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full bg-red-600 px-5 py-4 text-sm font-bold text-white shadow-2xl ring-4 ring-white hover:bg-red-700"
        aria-label="Abrir assistente IA"
      >
        IA
      </button>
    </div>
  );
}
