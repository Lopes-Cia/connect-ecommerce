import { NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { getPedido } from "@/lib/integration/checkoutService";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ pedidoId: string }> }
) {
  try {
    const { pedidoId } = await context.params;
    const parsedPedidoId = Number.parseInt(pedidoId, 10);
    if (!Number.isFinite(parsedPedidoId)) {
      return NextResponse.json({ success: false, message: "pedidoId invalido." }, { status: 400 });
    }
    const result = await getPedido(parsedPedidoId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: "Erro na integracao (pedidos)" },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Unexpected integration error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
