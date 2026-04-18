import { NextRequest, NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { listFreteOpcoes } from "@/lib/integration/checkoutService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ checkoutId: string }> }
) {
  try {
    const { checkoutId } = await context.params;
    const parsedCheckoutId = Number.parseInt(checkoutId, 10);
    const cep = request.nextUrl.searchParams.get("cep") ?? undefined;

    if (!Number.isFinite(parsedCheckoutId)) {
      return NextResponse.json({ success: false, message: "checkoutId invalido." }, { status: 400 });
    }

    const result = await listFreteOpcoes(parsedCheckoutId, cep);
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
