import { NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { applyCupom, removeCupom } from "@/lib/integration/checkoutService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { clienteId?: unknown; codigo?: unknown }
      | null;
    const clienteId = Number.parseInt(String(body?.clienteId ?? "").trim(), 10);
    const codigo = String(body?.codigo ?? "").trim();

    if (!Number.isFinite(clienteId) || !codigo) {
      return NextResponse.json(
        { success: false, message: "clienteId e codigo sao obrigatorios." },
        { status: 400 }
      );
    }

    const result = await applyCupom({ clienteId, codigo });
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

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { clienteId?: unknown } | null;
    const clienteId = Number.parseInt(String(body?.clienteId ?? "").trim(), 10);
    if (!Number.isFinite(clienteId)) {
      return NextResponse.json({ success: false, message: "clienteId obrigatorio." }, { status: 400 });
    }
    const result = await removeCupom({ clienteId });
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
