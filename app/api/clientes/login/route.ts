import { NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { loginCliente } from "@/lib/integration/clientesService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { email?: unknown; senha?: unknown }
      | null;

    const email = String(body?.email ?? "").trim();
    const senha = String(body?.senha ?? "");

    if (!email || !senha) {
      return NextResponse.json(
        { success: false, message: "Email e senha sao obrigatorios." },
        { status: 400 }
      );
    }

    const result = await loginCliente({ email, senha });
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

