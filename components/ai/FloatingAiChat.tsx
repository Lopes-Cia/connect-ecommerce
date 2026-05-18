"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  ChevronDown,
  Image as ImageIcon,
  Layers,
  List,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Tags,
  Zap,
} from "lucide-react";

import { useControlStore } from "@/stores/control-store";
import ErpSection from "@/components/ai/sections/ErpSection";
import RedisSection from "@/components/ai/sections/RedisSection";
import RedisCategoriesSection from "@/components/ai/sections/RedisCategoriesSection";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

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
  const copilotoEnabled = useControlStore((s) => s.copilotoEnabled);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<
    | "chat"
    | "atalhos"
    | "produtos_erp"
    | "produtos_redis"
    | "produtos_categorias"
    | "produtos_marcas"
    | "produtos_infos"
    | "home_banners"
    | "home_colecoes_a"
    | "home_colecoes_b"
  >("chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [produtosOpen, setProdutosOpen] = useState(true);
  const [homeOpen, setHomeOpen] = useState(true);

  useEffect(() => {
    if (!copilotoEnabled) return;
    console.log("[AI CHAT] Product context loaded", getProductContext());
  }, [copilotoEnabled]);

  if (!copilotoEnabled) return null;

  function resetConversation() {
    setMessages([]);
    setMessage("");
    setActiveView("chat");
  }

  function getNavButtonClass(active: boolean) {
    return `w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
      active ? "bg-zinc-950 text-white" : "text-zinc-800 hover:bg-zinc-200"
    }`;
  }

  function getNavIconClass(active: boolean) {
    return active ? "text-white" : "text-zinc-700";
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function getActiveViewLabel() {
    if (activeView === "chat") return "Chat";
    if (activeView === "atalhos") return "Atalhos";
    if (activeView === "produtos_erp") return "Produtos • ERP";
    if (activeView === "produtos_redis") return "Produtos • Redis";
    if (activeView === "produtos_categorias") return "Produtos • Categorias";
    if (activeView === "produtos_marcas") return "Produtos • Marcas";
    if (activeView === "produtos_infos") return "Produtos • Infos";
    if (activeView === "home_banners") return "Home • Banners";
    if (activeView === "home_colecoes_a") return "Home • Coleções A";
    if (activeView === "home_colecoes_b") return "Home • Coleções B";
    return "Chat";
  }

  async function sendMessage(customMessage?: string) {
    const text = (customMessage ?? message).trim();

    if (!text || loading) return;

    const currentProductContext = getProductContext();

    console.log("[AI CHAT] Sending message", {
      message: text,
      productContext: currentProductContext,
    });

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

      console.log("[AI CHAT] API response", data);

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
      console.error("[AI CHAT] Frontend error", error);

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
        <div className="relative z-40 mb-3 flex h-[min(88vh,860px)] w-[calc(100vw-24px)] max-w-[1400px] flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl md:w-[82vw]">
          <div className="flex items-center justify-between bg-zinc-950 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Assistente IA</p>
              <p className="text-xs text-zinc-300">Copiloto do Ecommerce</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex items-center justify-center rounded-full px-2 py-1 text-sm hover:bg-white/10 md:hidden"
                aria-label="Abrir menu"
              >
                <Menu size={18} />
              </button>
              <button
                type="button"
                onClick={resetConversation}
                className="rounded-full px-2 py-1 text-xs text-zinc-200 hover:bg-white/10 hover:text-white"
                aria-label="Nova conversa"
              >
                Nova
              </button>
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

          <div className="border-b border-zinc-200 bg-white px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">{getActiveViewLabel()}</p>
          </div>

          <div className="flex min-h-0 flex-1">
            <div
              className={`hidden shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 p-3 md:flex ${
                sidebarCollapsed ? "w-14" : "w-64"
              }`}
            >
              <button
                type="button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                className="mb-2 flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 hover:bg-zinc-100"
                aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setActiveView("chat")}
                className={getNavButtonClass(activeView === "chat")}
              >
                <span className="flex items-center gap-2">
                  <MessageSquare size={18} className={getNavIconClass(activeView === "chat")} />
                  {sidebarCollapsed ? null : <span>Chat</span>}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setProdutosOpen((current) => !current)}
                className={`mt-2 ${getNavButtonClass(
                  activeView === "produtos_erp" ||
                    activeView === "produtos_redis" ||
                    activeView === "produtos_categorias" ||
                    activeView === "produtos_marcas" ||
                    activeView === "produtos_infos"
                )}`}
                aria-expanded={produtosOpen}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Boxes
                      size={18}
                      className={getNavIconClass(
                        activeView === "produtos_erp" ||
                          activeView === "produtos_redis" ||
                          activeView === "produtos_categorias" ||
                          activeView === "produtos_marcas" ||
                          activeView === "produtos_infos"
                      )}
                    />
                    {sidebarCollapsed ? null : <span>Produtos</span>}
                  </span>
                  {sidebarCollapsed ? null : (
                    <ChevronDown
                      size={16}
                      className={`transition ${produtosOpen ? "rotate-0" : "-rotate-90"}`}
                    />
                  )}
                </span>
              </button>

              {produtosOpen && !sidebarCollapsed ? (
                <div className="mt-1 space-y-1 pl-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("produtos_erp");
                    }}
                    className={getNavButtonClass(activeView === "produtos_erp")}
                  >
                    <span className="flex items-center gap-2">
                      <Boxes size={18} className={getNavIconClass(activeView === "produtos_erp")} />
                      <span>ERP</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("produtos_redis");
                    }}
                    className={getNavButtonClass(activeView === "produtos_redis")}
                  >
                    <span className="flex items-center gap-2">
                      <Boxes size={18} className={getNavIconClass(activeView === "produtos_redis")} />
                      <span>Redis</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("produtos_categorias");
                    }}
                    className={getNavButtonClass(activeView === "produtos_categorias")}
                  >
                    <span className="flex items-center gap-2">
                      <Layers size={18} className={getNavIconClass(activeView === "produtos_categorias")} />
                      <span>Categorias</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("produtos_marcas");
                      sendMessage("Quais marcas estão disponíveis? Liste em ordem alfabética.");
                    }}
                    className={getNavButtonClass(activeView === "produtos_marcas")}
                  >
                    <span className="flex items-center gap-2">
                      <Tags size={18} className={getNavIconClass(activeView === "produtos_marcas")} />
                      <span>Marcas</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("produtos_infos");
                      sendMessage("Liste as infos do catálogo disponíveis (campos, status e origem dos dados).");
                    }}
                    className={getNavButtonClass(activeView === "produtos_infos")}
                  >
                    <span className="flex items-center gap-2">
                      <List size={18} className={getNavIconClass(activeView === "produtos_infos")} />
                      <span>Infos</span>
                    </span>
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setHomeOpen((current) => !current)}
                className={`mt-2 ${getNavButtonClass(
                  activeView === "home_banners" || activeView === "home_colecoes_a" || activeView === "home_colecoes_b"
                )}`}
                aria-expanded={homeOpen}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <ImageIcon
                      size={18}
                      className={getNavIconClass(
                        activeView === "home_banners" ||
                          activeView === "home_colecoes_a" ||
                          activeView === "home_colecoes_b"
                      )}
                    />
                    {sidebarCollapsed ? null : <span>Home</span>}
                  </span>
                  {sidebarCollapsed ? null : (
                    <ChevronDown size={16} className={`transition ${homeOpen ? "rotate-0" : "-rotate-90"}`} />
                  )}
                </span>
              </button>

              {homeOpen && !sidebarCollapsed ? (
                <div className="mt-1 space-y-1 pl-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("home_banners");
                      sendMessage("Mostre o mockup/estrutura de banners da Home (dados, ordem e cache).");
                    }}
                    className={getNavButtonClass(activeView === "home_banners")}
                  >
                    <span className="flex items-center gap-2">
                      <ImageIcon size={18} className={getNavIconClass(activeView === "home_banners")} />
                      <span>Banners</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("home_colecoes_a");
                      sendMessage("Mostre o mockup/estrutura de Coleções A na Home (dados, regra e cache).");
                    }}
                    className={getNavButtonClass(activeView === "home_colecoes_a")}
                  >
                    <span className="flex items-center gap-2">
                      <Layers size={18} className={getNavIconClass(activeView === "home_colecoes_a")} />
                      <span>Coleções A</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("home_colecoes_b");
                      sendMessage("Mostre o mockup/estrutura de Coleções B na Home (dados, regra e cache).");
                    }}
                    className={getNavButtonClass(activeView === "home_colecoes_b")}
                  >
                    <span className="flex items-center gap-2">
                      <Layers size={18} className={getNavIconClass(activeView === "home_colecoes_b")} />
                      <span>Coleções B</span>
                    </span>
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setActiveView("atalhos")}
                className={`mt-2 ${getNavButtonClass(activeView === "atalhos")}`}
              >
                <span className="flex items-center gap-2">
                  <Zap size={18} className={getNavIconClass(activeView === "atalhos")} />
                  {sidebarCollapsed ? null : <span>Atalhos</span>}
                </span>
              </button>
              <div className="mt-auto pt-3">
                <button
                  type="button"
                  onClick={resetConversation}
                  className={`w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100 ${
                    sidebarCollapsed ? "px-0 text-center" : ""
                  }`}
                >
                  {sidebarCollapsed ? "×" : "Limpar conversa"}
                </button>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto p-4 text-sm">
                {activeView === "produtos_erp" ? (
                  <ErpSection />
                ) : activeView === "produtos_redis" ? (
                  <RedisSection />
                ) : activeView === "produtos_categorias" ? (
                  <RedisCategoriesSection />
                ) : activeView === "atalhos" ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView("chat");
                        sendMessage("Quais endpoints de API esta tela chama?");
                      }}
                      className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-left text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      Quais endpoints de API esta tela chama?
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView("chat");
                        sendMessage("Onde estão os componentes principais desta página?");
                      }}
                      className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-left text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      Onde estão os componentes principais desta página?
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-sm font-semibold text-zinc-900">Como posso ajudar?</p>
                        <p className="mt-1 text-xs text-zinc-600">
                          Pergunte sobre a página atual (texto e imagens) ou use um atalho no menu.
                        </p>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => sendMessage("Resuma esta página em 5 bullets objetivos.")}
                          >
                            Resumir página
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => sendMessage("Quais dúvidas comuns um cliente teria sobre este produto?")}
                          >
                            Dúvidas comuns
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => sendMessage("Sugira melhorias de copy (título, descrição e benefícios).")}
                          >
                            Melhorar copy
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {messages.map((item, index) => (
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

                    {loading ? (
                      <div className="mr-auto rounded-2xl bg-zinc-100 px-3 py-2 text-zinc-500">
                        Analisando...
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {activeView === "produtos_erp" || activeView === "produtos_redis" ? null : (
                <div className="border-t border-zinc-200 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <Input
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Digite sua pergunta (ou /redis help)"
                        className="h-10 rounded-xl border-zinc-300 focus-visible:border-zinc-900 focus-visible:ring-zinc-900/20"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={() => sendMessage()}
                      disabled={loading || !message.trim()}
                      className="h-10 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800"
                    >
                      Enviar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Menu</DialogTitle>
              </DialogHeader>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant={activeView === "chat" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveView("chat");
                    closeMobileMenu();
                  }}
                >
                  <MessageSquare />
                  Chat
                </Button>

                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Produtos</p>
                  <div className="mt-2 space-y-2">
                    <Button
                      type="button"
                      variant={activeView === "produtos_erp" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveView("produtos_erp");
                        closeMobileMenu();
                      }}
                    >
                      <Boxes />
                      ERP
                    </Button>
                    <Button
                      type="button"
                      variant={activeView === "produtos_redis" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveView("produtos_redis");
                        closeMobileMenu();
                      }}
                    >
                      <Boxes />
                      Redis
                    </Button>
                    <Button
                      type="button"
                      variant={activeView === "produtos_categorias" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveView("produtos_categorias");
                        closeMobileMenu();
                      }}
                    >
                      <Layers />
                      Categorias
                    </Button>
                    <Button
                      type="button"
                      variant={activeView === "produtos_marcas" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveView("produtos_marcas");
                        closeMobileMenu();
                        sendMessage("Quais marcas estão disponíveis? Liste em ordem alfabética.");
                      }}
                    >
                      <Tags />
                      Marcas
                    </Button>
                    <Button
                      type="button"
                      variant={activeView === "produtos_infos" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveView("produtos_infos");
                        closeMobileMenu();
                        sendMessage("Liste as infos do catálogo disponíveis (campos, status e origem dos dados).");
                      }}
                    >
                      <List />
                      Infos
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Home</p>
                  <div className="mt-2 space-y-2">
                    <Button
                      type="button"
                      variant={activeView === "home_banners" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveView("home_banners");
                        closeMobileMenu();
                        sendMessage("Mostre o mockup/estrutura de banners da Home (dados, ordem e cache).");
                      }}
                    >
                      <ImageIcon />
                      Banners
                    </Button>
                    <Button
                      type="button"
                      variant={activeView === "home_colecoes_a" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveView("home_colecoes_a");
                        closeMobileMenu();
                        sendMessage("Mostre o mockup/estrutura de Coleções A na Home (dados, regra e cache).");
                      }}
                    >
                      <Layers />
                      Coleções A
                    </Button>
                    <Button
                      type="button"
                      variant={activeView === "home_colecoes_b" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveView("home_colecoes_b");
                        closeMobileMenu();
                        sendMessage("Mostre o mockup/estrutura de Coleções B na Home (dados, regra e cache).");
                      }}
                    >
                      <Layers />
                      Coleções B
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant={activeView === "atalhos" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => {
                      setActiveView("atalhos");
                      closeMobileMenu();
                    }}
                  >
                    <Zap />
                    Atalhos
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
