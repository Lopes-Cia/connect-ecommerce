import { NextRequest, NextResponse } from "next/server";

import { HttpError } from "@/lib/integration/network";
import { listPedidos } from "@/lib/integration/checkoutService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const clienteId = Number.parseInt(String(request.nextUrl.searchParams.get("clienteId") ?? "").trim(), 10);
    const page = Number.parseInt(String(request.nextUrl.searchParams.get("page") ?? "1"), 10);
    const pageSize = Number.parseInt(String(request.nextUrl.searchParams.get("pageSize") ?? "20"), 10);

    if (!Number.isFinite(clienteId)) {
      return NextResponse.json({ success: false, message: "clienteId obrigatorio." }, { status: 400 });
    }

    const result = await listPedidos({
      clienteId,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });
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
