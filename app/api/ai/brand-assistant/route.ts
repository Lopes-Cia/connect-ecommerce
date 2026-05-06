export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productName = body?.productContext?.productName ?? "";

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
Você é especialista em catalogação de produtos para e-commerce.

Analise o produto abaixo e identifique:
- marca
- fabricante
- categoria
- confiança

Produto:
${productName}

Responda em português do Brasil.
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
