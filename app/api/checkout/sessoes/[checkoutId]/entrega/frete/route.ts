import { NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { setFreteSelecionado } from "@/lib/integration/checkoutService";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ checkoutId: string }> }
) {
  try {
    const { checkoutId } = await context.params;
    const parsedCheckoutId = Number.parseInt(checkoutId, 10);
    const body = (await request.json().catch(() => null)) as { codigo?: unknown } | null;
    const codigo = String(body?.codigo ?? "").trim();

    if (!Number.isFinite(parsedCheckoutId) || !codigo) {
      return NextResponse.json(
        { success: false, message: "checkoutId e codigo sao obrigatorios." },
        { status: 400 }
      );
    }

    const result = await setFreteSelecionado(parsedCheckoutId, { codigo });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: "Erro na integracao (checkout)" },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Unexpected integration error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
