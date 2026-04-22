import { NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { createCheckoutSessao } from "@/lib/integration/checkoutService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          clienteId?: unknown;
          contato?: Record<string, unknown>;
          enderecoEntrega?: Record<string, unknown>;
        }
      | null;

    const clienteId = Number.parseInt(String(body?.clienteId ?? "").trim(), 10);
    if (!Number.isFinite(clienteId)) {
      return NextResponse.json({ success: false, message: "clienteId obrigatorio." }, { status: 400 });
    }

    const result = await createCheckoutSessao({
      clienteId,
      contato: body?.contato,
      enderecoEntrega: body?.enderecoEntrega,
    });
    return NextResponse.json(result, { status: 201 });
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
