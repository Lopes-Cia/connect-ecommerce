function sliceText(value: string, limit: number) {
  const text = String(value ?? '')
  if (text.length <= limit) return text
  return text.slice(0, limit) + '\n\n[TRUNCADO]'
}

function pickOutputText(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const obj = data as Record<string, unknown>
  const direct = obj.output_text
  if (typeof direct === 'string') return direct
  const output = obj.output
  if (!Array.isArray(output) || !output[0] || typeof output[0] !== 'object') return ''
  const first = output[0] as Record<string, unknown>
  const content = first.content
  if (!Array.isArray(content) || !content[0] || typeof content[0] !== 'object') return ''
  const c0 = content[0] as Record<string, unknown>
  return typeof c0.text === 'string' ? c0.text : ''
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const product = body && typeof body === 'object' ? (body as Record<string, unknown>).product : null

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          error: 'OPENAI_API_KEY não configurada.',
        },
        { status: 500 }
      )
    }

    const prompt = `
Extraia a marca de um produto.

Regras:
- Responda APENAS com um JSON válido.
- Formato: {"brandName": string | null}
- Se não houver marca inferível pelo texto, retorne null.
- Não invente marca; use apenas indícios do produto.

Produto (JSON):
${sliceText(JSON.stringify(product ?? {}, null, 2), 9000)}
`.trim()

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: prompt,
      }),
    })

    const data = (await response.json().catch(() => null)) as unknown
    if (!response.ok) {
      const message =
        data && typeof data === 'object'
          ? ((data as Record<string, unknown>).error as Record<string, unknown> | undefined)?.message
          : null
      return Response.json(
        {
          error: typeof message === 'string' && message.trim() ? message : 'Erro ao consultar OpenAI.',
        },
        { status: response.status }
      )
    }

    const text = pickOutputText(data)

    try {
      const parsed = JSON.parse(text) as unknown
      const brandName =
        parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>).brandName : null
      return Response.json({ ok: true, brandName: typeof brandName === 'string' ? brandName.trim() : null })
    } catch {
      return Response.json({ ok: true, brandName: null })
    }
  } catch {
    return Response.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
