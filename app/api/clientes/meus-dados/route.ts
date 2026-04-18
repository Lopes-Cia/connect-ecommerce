import { NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { updateMeusDadosCliente } from "@/lib/integration/clientesService";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { clienteId?: unknown; patch?: unknown }
      | null;

    const clienteId = Number.parseInt(String(body?.clienteId ?? "").trim(), 10);
    const patch = body?.patch;

    if (!Number.isFinite(clienteId) || !patch || typeof patch !== "object" || Array.isArray(patch)) {
      return NextResponse.json(
        { success: false, message: "clienteId e patch sao obrigatorios." },
        { status: 400 }
      );
    }

    const result = await updateMeusDadosCliente({ clienteId, patch: patch as Record<string, unknown> });
    return NextResponse.json(result);
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

