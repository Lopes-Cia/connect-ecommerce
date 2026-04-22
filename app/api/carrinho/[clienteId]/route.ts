import { NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { getCarrinho } from "@/lib/integration/checkoutService";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId } = await context.params;
    const parsedClienteId = Number.parseInt(clienteId, 10);
    if (!Number.isFinite(parsedClienteId)) {
      return NextResponse.json({ success: false, message: "clienteId invalido." }, { status: 400 });
    }

    const result = await getCarrinho(parsedClienteId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: "Erro na integracao (carrinho)" },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Unexpected integration error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
