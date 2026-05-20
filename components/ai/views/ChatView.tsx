"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ImageScraperResultView from "@/components/ai/views/ImageScraperResult";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function tryParseJsonObjectFromText(value: string): unknown | null {
  const text = String(value ?? "");
  const start = text.indexOf("{");
  if (start === -1) return null;
  const candidate = text.slice(start).trim();
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return null;
  }
}

function isImageScraperResult(value: unknown): value is { items?: unknown } {
  if (!value || typeof value !== "object") return false;
  return "items" in value;
}

export default function ChatView({
  messages,
  loading,
  message,
  setMessage,
  sendMessage,
}: {
  messages: ChatMessage[];
  loading: boolean;
  message: string;
  setMessage: (value: string) => void;
  sendMessage: () => Promise<void>;
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 text-sm">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-zinc-900">Como posso ajudar?</p>
              <p className="mt-1 text-xs text-zinc-600">Pergunte sobre a página atual (texto e imagens).</p>
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
              {(() => {
                if (item.role !== "assistant") return item.content;
                const parsed = tryParseJsonObjectFromText(item.content);
                if (!isImageScraperResult(parsed)) return item.content;

                return (
                  <>
                    <ImageScraperResultView result={parsed} />
                  </>
                );
              })()}
            </div>
          ))}

          {loading ? (
            <div className="mr-auto rounded-2xl bg-zinc-100 px-3 py-2 text-zinc-500">Analisando...</div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-zinc-200 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Digite sua pergunta"
              className="h-10 rounded-xl border-zinc-300 focus-visible:border-zinc-900 focus-visible:ring-zinc-900/20"
            />
          </div>

          <Button
            type="button"
            onClick={() => void sendMessage()}
            disabled={loading || !message.trim()}
            className="h-10 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800"
          >
            Enviar
          </Button>
        </div>
      </div>
    </>
  );
}

