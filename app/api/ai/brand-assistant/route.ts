export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("[AI API] Incoming request", body);

    const message = body?.message ?? "";
    const productContext = body?.productContext ?? {};
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

Comportamento principal:
- converse normalmente com o usuário
- responda cumprimentos como "oi", "olá", "bom dia"
- responda perguntas simples como "que dia é hoje?"
- seja educado, curto e objetivo
- responda sempre em português do Brasil

Data de hoje:
${today}

Você também pode ajudar com produtos quando o usuário perguntar sobre marca, fabricante, categoria, cadastro ou dados da página.

Dados da página atual, se forem úteis:
URL: ${productContext.url ?? ""}
Título: ${productContext.title ?? ""}
Produto: ${productContext.productName ?? ""}
Textos visíveis: ${productContext.pageText ?? ""}
Alt das imagens: ${(productContext.imageAltTexts ?? []).join(" | ")}
URLs das imagens: ${(productContext.imageUrls ?? []).join(" | ")}

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
