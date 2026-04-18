import { NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { addCarrinhoItem } from "@/lib/integration/checkoutService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { clienteId?: unknown; item?: { produtoId?: unknown; quantidade?: unknown } }
      | null;

    const clienteId = Number.parseInt(String(body?.clienteId ?? "").trim(), 10);
    const produtoId = Number.parseInt(String(body?.item?.produtoId ?? "").trim(), 10);
    const quantidade = Number.parseInt(String(body?.item?.quantidade ?? "").trim(), 10);

    if (!Number.isFinite(clienteId) || !Number.isFinite(produtoId) || !Number.isFinite(quantidade)) {
      return NextResponse.json(
        { success: false, message: "clienteId, produtoId e quantidade sao obrigatorios." },
        { status: 400 }
      );
    }

    const result = await addCarrinhoItem({
      clienteId,
      item: { produtoId, quantidade },
    });
    return NextResponse.json(result, { status: 201 });
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
