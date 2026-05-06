export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productContext = body?.productContext ?? {};

    if (!process.env.OPENAI_API_KEY) {
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
Você é especialista em catalogação de produtos para e-commerce brasileiro.

Sua tarefa:
- identificar a marca correta do produto
- identificar fabricante
- identificar categoria correta
- detectar inconsistências nos dados da página

IMPORTANTE:
- use TODOS os dados da página
- use o nome do produto
- use textos visíveis
- use breadcrumbs
- use informações de embalagem
- use textos de imagem
- use contexto visual descrito
- alguns produtos possuem categorias erradas
- alguns produtos possuem nomes bagunçados

URL:
${productContext.url ?? ""}

Título da página:
${productContext.title ?? ""}

Nome do produto:
${productContext.productName ?? ""}

Textos visíveis da página:
${productContext.pageText ?? ""}

Alt das imagens:
${(productContext.imageAltTexts ?? []).join("\n")}

URLs das imagens:
${(productContext.imageUrls ?? []).join("\n")}

Responda em português do Brasil.

Formato obrigatório:
Marca:
Fabricante:
Categoria correta:
Confiança:
Análise:
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
        {
          error:
            data?.error?.message ?? "Erro ao consultar OpenAI.",
        },
        {
          status: response.status,
        }
      );
    }

    return Response.json({
      answer:
        data.output_text ??
        "Não consegui identificar a marca deste produto.",
    });
  } catch (error) {
    console.error(error);

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
