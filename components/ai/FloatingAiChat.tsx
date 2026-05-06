"use client";

import { useEffect, useState } from "react";

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
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("[AI CHAT] Product context loaded", getProductContext());
  }, []);

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
    <div className="fixed bottom-5 right-5 z-[999999]">
      {open ? (
        <div className="mb-3 flex h-[520px] w-[360px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl">
          <div className="flex items-center justify-between bg-zinc-950 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Assistente IA</p>
              <p className="text-xs text-zinc-300">Copiloto do Ecommerce</p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-2 py-1 text-sm hover:bg-white/10"
              aria-label="Fechar assistente IA"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    sendMessage(
                      "Qual arquivo do repositório renderiza esta página?"
                    )
                  }
                  className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-left text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Qual arquivo do repositório renderiza esta página?
                </button>
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

          <div className="border-t border-zinc-200 p-3">
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Digite sua pergunta"
                className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              />

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={loading || !message.trim()}
                className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
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
