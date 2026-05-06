function extractJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = String(body?.question ?? "").trim();
    const schema = body?.schema ?? null;
    const sample = body?.sample ?? null;

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY não configurada." },
        { status: 500 }
      );
    }

    if (!question) {
      return Response.json({ error: "Pergunta vazia." }, { status: 400 });
    }

    const prompt = `
Você é um planejador de consultas para um catálogo de produtos.

Você receberá:
- uma PERGUNTA do usuário
- um SCHEMA com os campos disponíveis
- uma AMOSTRA de itens (parcial do catálogo)

Sua tarefa é retornar SOMENTE um JSON (sem markdown) com um "query spec" para o app executar no catálogo completo.

Regras:
- use apenas campos presentes no SCHEMA
- nunca invente números; você não tem acesso ao catálogo completo
- se não der para responder com segurança, retorne intent "unknown" e explique em "notes"
- não inclua texto fora do JSON

Formato obrigatório:
{
  "intent": "count" | "list" | "group_by" | "unknown",
  "filters": [{ "field": string, "op": "=="|"!="|">"|">="|"<"|"<="|"contains"|"in"|"exists"|"isEmpty", "value"?: any }],
  "groupBy"?: string,
  "limit"?: number,
  "notes"?: string
}

PERGUNTA:
${question}

SCHEMA:
${JSON.stringify(schema, null, 2)}

AMOSTRA (até ~40 itens):
${JSON.stringify(sample, null, 2)}
`;

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

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data?.error?.message ?? "Erro ao consultar OpenAI." },
        { status: response.status }
      );
    }

    const text =
      data.output_text ??
      data.output?.[0]?.content?.[0]?.text ??
      "";

    const spec = extractJsonObject(String(text ?? ""));
    if (!spec) {
      return Response.json(
        { error: "Resposta da IA não é um JSON válido.", raw: text },
        { status: 422 }
      );
    }

    return Response.json({ spec });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno.";
    return Response.json({ error: message }, { status: 500 });
  }
}

