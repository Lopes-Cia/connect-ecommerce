import { NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { deleteEnderecoCliente, updateEnderecoCliente } from "@/lib/integration/clientesService";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ enderecoId: string }> }
) {
  try {
    const params = await context.params;
    const enderecoId = Number.parseInt(String(params?.enderecoId ?? "").trim(), 10);
    const body = (await request.json().catch(() => null)) as
      | { clienteId?: unknown; patch?: unknown }
      | null;

    const clienteIdRaw = String(body?.clienteId ?? "").trim();
    const clienteId = clienteIdRaw ? Number.parseInt(clienteIdRaw, 10) : undefined;
    const patch = body?.patch;

    if (!Number.isFinite(enderecoId) || !patch || typeof patch !== "object" || Array.isArray(patch)) {
      return NextResponse.json(
        { success: false, message: "enderecoId e patch sao obrigatorios." },
        { status: 400 }
      );
    }
    if (clienteIdRaw && !Number.isFinite(clienteId)) {
      return NextResponse.json({ success: false, message: "clienteId invalido." }, { status: 400 });
    }

    const result = await updateEnderecoCliente(enderecoId, {
      ...(clienteIdRaw ? { clienteId } : {}),
      patch: patch as Record<string, unknown>,
    });
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ enderecoId: string }> }
) {
  try {
    const params = await context.params;
    const enderecoId = Number.parseInt(String(params?.enderecoId ?? "").trim(), 10);
    const body = (await request.json().catch(() => null)) as
      | { clienteId?: unknown }
      | null;
    const clienteIdRaw = String(body?.clienteId ?? "").trim();
    const clienteId = clienteIdRaw ? Number.parseInt(clienteIdRaw, 10) : undefined;

    if (!Number.isFinite(enderecoId)) {
      return NextResponse.json({ success: false, message: "enderecoId invalido." }, { status: 400 });
    }
    if (clienteIdRaw && !Number.isFinite(clienteId)) {
      return NextResponse.json({ success: false, message: "clienteId invalido." }, { status: 400 });
    }

    const result = await deleteEnderecoCliente(enderecoId, clienteIdRaw ? { clienteId } : {});
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

