import { NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { deleteCarrinhoItem, updateCarrinhoItem } from "@/lib/integration/checkoutService";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await context.params;
    const parsedItemId = Number.parseInt(itemId, 10);
    const body = (await request.json().catch(() => null)) as
      | { clienteId?: unknown; patch?: { quantidade?: unknown } }
      | null;
    const clienteId = Number.parseInt(String(body?.clienteId ?? "").trim(), 10);
    const quantidade = Number.parseInt(String(body?.patch?.quantidade ?? "").trim(), 10);

    if (!Number.isFinite(parsedItemId) || !Number.isFinite(clienteId) || !Number.isFinite(quantidade)) {
      return NextResponse.json(
        { success: false, message: "itemId, clienteId e quantidade sao obrigatorios." },
        { status: 400 }
      );
    }

    const result = await updateCarrinhoItem(parsedItemId, {
      clienteId,
      patch: { quantidade },
    });
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await context.params;
    const parsedItemId = Number.parseInt(itemId, 10);
    const body = (await request.json().catch(() => null)) as { clienteId?: unknown } | null;
    const clienteId = Number.parseInt(String(body?.clienteId ?? "").trim(), 10);

    if (!Number.isFinite(parsedItemId) || !Number.isFinite(clienteId)) {
      return NextResponse.json(
        { success: false, message: "itemId e clienteId sao obrigatorios." },
        { status: 400 }
      );
    }

    const result = await deleteCarrinhoItem(parsedItemId, { clienteId });
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
