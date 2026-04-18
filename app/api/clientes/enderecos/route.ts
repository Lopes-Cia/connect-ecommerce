import { NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { createEnderecoCliente } from "@/lib/integration/clientesService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { clienteId?: unknown; endereco?: unknown }
      | null;

    const clienteId = Number.parseInt(String(body?.clienteId ?? "").trim(), 10);
    const endereco = body?.endereco;

    if (!Number.isFinite(clienteId) || !endereco || typeof endereco !== "object" || Array.isArray(endereco)) {
      return NextResponse.json(
        { success: false, message: "clienteId e endereco sao obrigatorios." },
        { status: 400 }
      );
    }

    const result = await createEnderecoCliente({ clienteId, endereco: endereco as Record<string, unknown> });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: "Erro na integracao (clientes)" },
        { status: error.status }
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected integration error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

