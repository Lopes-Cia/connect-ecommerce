import fs from "fs/promises";
import path from "path";
import { getCatalogKeyPrefix, getCatalogRedisClient } from "@/lib/integration/catalogRedis";

async function loadAssistantContext() {
  try {
    return await fs.readFile(
      path.join(process.cwd(), "IA", "ASSISTANT_CONTEXT.md"),
      "utf-8"
    );
  } catch (error) {
    console.error("[AI API] Failed to load assistant context", error);
    return "";
  }
}

async function loadOptionalFile(relativePath: string) {
  try {
    return await fs.readFile(path.join(process.cwd(), relativePath), "utf-8");
  } catch {
    return "";
  }
}

function sliceText(value: string, limit: number) {
  const text = String(value ?? "");
  if (text.length <= limit) return text;
  return text.slice(0, limit) + "\n\n[TRUNCADO]";
}

type RedisCommandResult = {
  ok: boolean;
  answer: string;
};

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function extractYesFlag(input: string) {
  const trimmed = input.trim();
  if (/(?:^|\s)--yes\s*$/i.test(trimmed)) {
    return { text: trimmed.replace(/\s--yes\s*$/i, "").trim(), yes: true };
  }
  return { text: trimmed, yes: false };
}

function mustBeCatalogKey(key: string, prefix: string) {
  if (!key.startsWith(`${prefix}:`)) {
    return `Chave inválida. Use apenas chaves que começam com "${prefix}:".`;
  }
  return null;
}

function formatBlock(title: string, payload: unknown) {
  if (typeof payload === "string") return `${title}\n${payload}`;
  return `${title}\n${JSON.stringify(payload, null, 2)}`;
}

async function handleRedisCommand(rawMessage: string): Promise<RedisCommandResult> {
  const { text, yes } = extractYesFlag(rawMessage);
  const prefix = getCatalogKeyPrefix();
  const isProd = process.env.NODE_ENV === "production";

  const rest = text.replace(/^\/redis\b/i, "").trim();
  if (!rest || rest.toLowerCase() === "help") {
    return {
      ok: true,
      answer: [
        "Comandos Redis (catálogo)",
        "",
        "Leitura:",
        `- /redis prefix`,
        `- /redis ping`,
        `- /redis scan ${prefix}:product:* 50`,
        `- /redis get ${prefix}:product:123`,
        `- /redis ttl ${prefix}:product:123`,
        `- /redis exists ${prefix}:product:123`,
        `- /redis ft.list`,
        `- /redis ft.search idx:catalog:product (@name:\"leite\") 10`,
        "",
        "CRUD (dev/stage; em produção é bloqueado) — adicione --yes para executar:",
        `- /redis set ${prefix}:brand:10 {"id":10,"nome":"Nova Marca","slug":"nova-marca"} --yes`,
        `- /redis del ${prefix}:brand:10 --yes`,
        "",
        "Atalhos por entidade:",
        `- /redis product get 123`,
        `- /redis product set 123 {...} --yes`,
        `- /redis product del 123 --yes`,
        `- /redis brand get 10`,
        `- /redis category get 55`,
      ].join("\n"),
    };
  }

  const [cmdRaw] = rest.split(/\s+/, 1);
  const cmd = cmdRaw.toLowerCase();
  const args = rest.slice(cmdRaw.length).trim();

  const client = await getCatalogRedisClient();

  const blockedWriteAnswer = (reason: string) => ({
    ok: false,
    answer: reason,
  });

  const requireWriteAllowed = () => {
    if (isProd) return blockedWriteAnswer("Operação de escrita bloqueada em produção.");
    if (!yes)
      return blockedWriteAnswer(
        "Operação de escrita não executada. Para executar de verdade, repita o comando com --yes no final."
      );
    return null;
  };

  if (cmd === "prefix") {
    return { ok: true, answer: formatBlock("Prefixo do catálogo", { prefix }) };
  }

  if (cmd === "ping") {
    const pong = await client.ping();
    return { ok: true, answer: formatBlock("PING", { pong }) };
  }

  if (cmd === "scan") {
    const parts = args.split(/\s+/).filter(Boolean);
    const pattern = parts[0] ? String(parts[0]) : "";
    const limit = parts[1] ? Math.max(1, Math.min(500, Number(parts[1]) || 50)) : 50;

    if (!pattern) return { ok: false, answer: "Uso: /redis scan <pattern> [limit]" };
    const keyErr = mustBeCatalogKey(pattern.replace(/\*+$/, ""), prefix);
    if (keyErr) return { ok: false, answer: keyErr };

    const keys: string[] = [];
    for await (const chunk of client.scanIterator({ MATCH: pattern, COUNT: 1000 })) {
      const list = Array.isArray(chunk) ? chunk : [chunk];
      for (const k of list) {
        keys.push(String(k));
        if (keys.length >= limit) break;
      }
      if (keys.length >= limit) break;
    }

    return {
      ok: true,
      answer: formatBlock("SCAN", { pattern, limit, count: keys.length, keys }),
    };
  }

  if (cmd === "exists") {
    const key = args.split(/\s+/).filter(Boolean)[0] ?? "";
    if (!key) return { ok: false, answer: "Uso: /redis exists <key>" };
    const keyErr = mustBeCatalogKey(key, prefix);
    if (keyErr) return { ok: false, answer: keyErr };
    const exists = await client.exists(key);
    return { ok: true, answer: formatBlock("EXISTS", { key, exists }) };
  }

  if (cmd === "ttl") {
    const key = args.split(/\s+/).filter(Boolean)[0] ?? "";
    if (!key) return { ok: false, answer: "Uso: /redis ttl <key>" };
    const keyErr = mustBeCatalogKey(key, prefix);
    if (keyErr) return { ok: false, answer: keyErr };
    const ttl = await client.ttl(key);
    return { ok: true, answer: formatBlock("TTL (segundos)", { key, ttl }) };
  }

  if (cmd === "get") {
    const parts = args.split(/\s+/).filter(Boolean);
    const key = parts[0] ?? "";
    const jsonPath = parts[1] ?? "$";
    if (!key) return { ok: false, answer: "Uso: /redis get <key> [jsonPath]" };
    const keyErr = mustBeCatalogKey(key, prefix);
    if (keyErr) return { ok: false, answer: keyErr };

    const raw = await client.sendCommand(["JSON.GET", key, jsonPath]);
    const parsed = typeof raw === "string" ? tryParseJson(raw) : raw;
    return { ok: true, answer: formatBlock("JSON.GET", { key, jsonPath, value: parsed ?? raw }) };
  }

  if (cmd === "set") {
    const gate = requireWriteAllowed();
    if (gate) return gate;

    const firstSpace = args.indexOf(" ");
    const key = (firstSpace === -1 ? args : args.slice(0, firstSpace)).trim();
    const jsonPayload = (firstSpace === -1 ? "" : args.slice(firstSpace + 1)).trim();

    if (!key || !jsonPayload) return { ok: false, answer: "Uso: /redis set <key> <json> --yes" };
    const keyErr = mustBeCatalogKey(key, prefix);
    if (keyErr) return { ok: false, answer: keyErr };
    const parsed = tryParseJson(jsonPayload);
    if (parsed === null) return { ok: false, answer: "JSON inválido no payload." };

    await client.sendCommand(["JSON.SET", key, "$", JSON.stringify(parsed)]);
    return { ok: true, answer: formatBlock("JSON.SET OK", { key }) };
  }

  if (cmd === "del" || cmd === "unlink") {
    const gate = requireWriteAllowed();
    if (gate) return gate;

    const key = args.split(/\s+/).filter(Boolean)[0] ?? "";
    if (!key) return { ok: false, answer: `Uso: /redis ${cmd} <key> --yes` };
    const keyErr = mustBeCatalogKey(key, prefix);
    if (keyErr) return { ok: false, answer: keyErr };

    const removed = await client.sendCommand(["UNLINK", key]);
    return { ok: true, answer: formatBlock("UNLINK", { key, removed }) };
  }

  if (cmd === "ft.list") {
    const raw = await client.sendCommand(["FT._LIST"]);
    const indexes = Array.isArray(raw) ? raw.map(String) : [];
    return { ok: true, answer: formatBlock("FT._LIST", { indexes }) };
  }

  if (cmd === "ft.search") {
    const parts = args.split(/\s+/).filter(Boolean);
    const index = parts[0] ?? "";
    if (!index) return { ok: false, answer: "Uso: /redis ft.search <index> <query> [limit]" };

    const maybeLimit = parts.length >= 2 ? parts[parts.length - 1] : "";
    const hasLimit = /^\d+$/.test(maybeLimit);
    const limit = hasLimit ? Math.max(1, Math.min(200, Number(maybeLimit) || 10)) : 10;
    const query = hasLimit ? parts.slice(1, -1).join(" ") : parts.slice(1).join(" ");
    if (!query) return { ok: false, answer: "Uso: /redis ft.search <index> <query> [limit]" };

    const raw = await client.sendCommand([
      "FT.SEARCH",
      index,
      query,
      "LIMIT",
      "0",
      String(limit),
      "RETURN",
      "1",
      "$",
      "DIALECT",
      "2",
    ]);

    if (!Array.isArray(raw) || raw.length < 1) return { ok: true, answer: formatBlock("FT.SEARCH", { total: 0, docs: [] }) };

    const total = Number(raw[0]) || 0;
    const docs: Array<{ key: string; value: unknown }> = [];
    for (let i = 1; i < raw.length; i += 2) {
      const key = String(raw[i]);
      const payload = raw[i + 1];
      const fieldsArray = Array.isArray(payload) ? payload : [];
      const valueRaw = fieldsArray.length >= 2 ? fieldsArray[1] : null;
      const value = typeof valueRaw === "string" ? tryParseJson(valueRaw) ?? valueRaw : valueRaw;
      docs.push({ key, value });
    }

    return { ok: true, answer: formatBlock("FT.SEARCH", { index, query, limit, total, docs }) };
  }

  if (cmd === "product" || cmd === "brand" || cmd === "category") {
    const parts = args.split(/\s+/).filter(Boolean);
    const action = (parts[0] ?? "").toLowerCase();
    const id = parts[1] ?? "";
    if (!action || !id) {
      return { ok: false, answer: `Uso: /redis ${cmd} <get|set|del> <id> [json] [--yes]` };
    }

    const key = `${prefix}:${cmd}:${id}`;
    if (action === "get") {
      const raw = await client.sendCommand(["JSON.GET", key]);
      const value = typeof raw === "string" ? tryParseJson(raw) ?? raw : raw;
      return { ok: true, answer: formatBlock("JSON.GET", { key, value }) };
    }

    if (action === "set") {
      const gate = requireWriteAllowed();
      if (gate) return gate;

      const jsonPayload = parts.slice(2).join(" ");
      if (!jsonPayload) return { ok: false, answer: `Uso: /redis ${cmd} set <id> <json> --yes` };
      const parsed = tryParseJson(jsonPayload);
      if (parsed === null) return { ok: false, answer: "JSON inválido no payload." };
      await client.sendCommand(["JSON.SET", key, "$", JSON.stringify(parsed)]);
      return { ok: true, answer: formatBlock("JSON.SET OK", { key }) };
    }

    if (action === "del") {
      const gate = requireWriteAllowed();
      if (gate) return gate;
      const removed = await client.sendCommand(["UNLINK", key]);
      return { ok: true, answer: formatBlock("UNLINK", { key, removed }) };
    }

    return { ok: false, answer: `Ação inválida. Use get|set|del.` };
  }

  return { ok: false, answer: "Comando não reconhecido. Use: /redis help" };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("[AI API] Incoming request", body);

    const message = body?.message ?? "";
    const productContext = body?.productContext ?? {};
    const catalogContext = body?.catalogContext ?? null;

    if (typeof message === "string" && message.trim().toLowerCase().startsWith("/redis")) {
      const result = await handleRedisCommand(message);
      return Response.json({ answer: result.answer }, { status: result.ok ? 200 : 400 });
    }

    const assistantContext = await loadAssistantContext();
    const redisCatalogDoc = await loadOptionalFile("IA/DESENHOS/REDIS-CATALOGO.md");
    const categoriasPesquisaDoc = await loadOptionalFile("IA/PESQUISA_CATEGORIAS.md");
    const today = new Date().toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    console.log("[AI API] Environment", {
      hasApiKey: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      assistantContextSize: assistantContext.length,
    });

    if (!process.env.OPENAI_API_KEY) {
      console.error("[AI API] Missing OPENAI_API_KEY");

      return Response.json(
        {
          error: "OPENAI_API_KEY não configurada.",
        },
        {
          status: 500,
        }
      );
    }

    const prompt = `
Você é o Assistente IA do E-commerce Connect.

Use obrigatoriamente o contexto do repositório abaixo quando a pergunta envolver código, arquivos, rotas, páginas, componentes, produto, catálogo ou arquitetura.

CONTEXTO DO REPOSITÓRIO:
${assistantContext}

Comportamento principal:
- converse normalmente com o usuário
- responda cumprimentos como "oi", "olá", "bom dia"
- responda perguntas simples como "que dia é hoje?"
- seja educado, curto e objetivo
- responda sempre em português do Brasil
- quando souber o arquivo exato pelo contexto do repositório, não chute caminhos genéricos como pages/produtos/[slug].js

Data de hoje:
${today}

Dados da página atual, se forem úteis:
URL: ${productContext.url ?? ""}
Título: ${productContext.title ?? ""}
Produto: ${productContext.productName ?? ""}
Slug do produto: ${productContext.productSlug ?? ""}
Textos visíveis: ${productContext.pageText ?? ""}
Alt das imagens: ${(productContext.imageAltTexts ?? []).join(" | ")}
URLs das imagens: ${(productContext.imageUrls ?? []).join(" | ")}

Contexto de catálogo (usar apenas esta chave como fonte de dados; não inventar números):
${catalogContext ? JSON.stringify(catalogContext, null, 2) : ""}

Contexto operacional (Redis / Catálogo):
${sliceText(redisCatalogDoc, 4500)}

Pesquisa e proposta (Categorias):
${sliceText(categoriasPesquisaDoc, 4500)}

Mensagem do usuário:
${message}
`;

    console.log("[AI API] Prompt size", prompt.length);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: prompt,
      }),
    });

    console.log("[AI API] OpenAI HTTP status", response.status);

    const data = await response.json();

    console.log("[AI API] OpenAI response", data);

    if (!response.ok) {
      console.error("[AI API] OpenAI error", data);

      return Response.json(
        {
          error:
            data?.error?.message ?? "Erro ao consultar OpenAI.",
        },
        {
          status: response.status,
        }
      );
    }

    const answer =
      data.output_text ??
      data.output?.[0]?.content?.[0]?.text ??
      "Não consegui responder agora.";

    console.log("[AI API] Final answer", answer);

    return Response.json({
      answer,
    });
  } catch (error) {
    console.error("[AI API] Internal error", error);

    return Response.json(
      {
        error: "Erro interno do assistente.",
      },
      {
        status: 500,
      }
    );
  }
}
