import { NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { listEnderecosCliente } from "@/lib/integration/clientesService";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ clienteId: string }> }
) {
  try {
    const params = await context.params;
    const clienteId = Number.parseInt(String(params?.clienteId ?? "").trim(), 10);

    if (!Number.isFinite(clienteId)) {
      return NextResponse.json({ success: false, message: "clienteId invalido." }, { status: 400 });
    }

    const result = await listEnderecosCliente(clienteId);
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

