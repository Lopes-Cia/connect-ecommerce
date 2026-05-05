import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { RawHttpError, integrationRawGetJsonServerToken } from "@/liz_refator/integration/rawClient";
import { PEDIDOS_INTEGRATION_ROUTES } from "@/liz_refator/integration/integrationRoutes";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function safeInt(value: unknown): number | null {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeIsoDate(value: unknown): string | null {
  const raw = safeString(value).trim();
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const time = Date.parse(normalized);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapGpDadoIntegrationToPedido(value: unknown) {
  const item = asRecord(value) ?? {};
  const payloadParsed = parseJsonObject(item.payload);
  const payload = payloadParsed ?? {};

  const orderId = safeString(item.orderId ?? item.orderid ?? item.id ?? payload.orderId).trim();
  const pedidoId = safeInt(orderId) ?? 0;
  const createdAt = normalizeIsoDate(item.dtCriacao ?? item.createdAt ?? payload.dateOrder ?? payload.dataPagamento);

  const cliente = asRecord(payload.cliente) ?? {};
  const itens = Array.isArray(payload.itens) ? (payload.itens as unknown[]) : [];

  const status = safeString(payload.posicao ?? payload.status ?? item.integrado).trim() || "desconhecido";
  const total = safeNumber(payload.valor, 0);
  const moeda = "BRL";

  const itensMapped = itens.map((raw) => {
    const it = asRecord(raw) ?? {};
    const quantidade = safeNumber(it.qt ?? it.quantidade, 0);
    return { quantidade };
  });

  const pagamentoMetodo = safeString(payload.planoCodigo ?? payload.pagamentoMetodo ?? "desconhecido").trim();
  const pagamentoStatus = safeString(payload.posicao ?? payload.pagamentoStatus ?? status).trim();

  const entregaCidade = safeString(cliente.cidade ?? cliente.municipio ?? cliente["município"]).trim();
  const entregaUf = safeString(cliente.UF ?? cliente.uf).trim();

  return {
    pedidoId,
    checkoutId: null,
    createdAt,
    status,
    resumo: { total, moeda },
    itens: itensMapped,
    entrega: { endereco: { cidade: entregaCidade, uf: entregaUf }, freteSelecionado: {} },
    pagamento: { metodo: pagamentoMetodo, status: pagamentoStatus },
    raw: { ...item, payload: payloadParsed ?? item.payload },
  };
}

export async function GET(request: NextRequest) {
  try {
    const page = Number.parseInt(String(request.nextUrl.searchParams.get("page") ?? "1"), 10);
    const pageSize = Number.parseInt(String(request.nextUrl.searchParams.get("pageSize") ?? "20"), 10);

    const session = await getSession();
    const cgc = session?.cliente?.cnpj ? String(session.cliente.cnpj).trim() : "";
    if (!cgc) {
      return NextResponse.json({ success: false, message: "Sessão inválida. Faça login novamente." }, { status: 401 });
    }

    const now = new Date();
    const year = now.getFullYear();
    const dtInicio = safeString(request.nextUrl.searchParams.get("dtInicio") ?? `${year}-01-01`).trim();
    const dtFinal = safeString(request.nextUrl.searchParams.get("dtFinal") ?? `${year}-12-31`).trim();

    const result = await integrationRawGetJsonServerToken<unknown>(PEDIDOS_INTEGRATION_ROUTES.getListDadoIntegration, {
      tipo: "OrderLopes",
      dtInicio,
      dtFinal,
      cgc,
    });

    const root = asRecord(result.data);
    const list = Array.isArray(result.data) ? (result.data as unknown[]) : Array.isArray(root?.data) ? (root?.data as unknown[]) : [];
    const pedidos = list.map(mapGpDadoIntegrationToPedido).filter((p) => Number.isFinite(p.pedidoId) && p.pedidoId > 0);

    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 20;
    const total = pedidos.length;
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const start = (safePage - 1) * safePageSize;
    const data = pedidos.slice(start, start + safePageSize);

    return NextResponse.json({
      success: true,
      request: result.request,
      data,
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages,
    });
  } catch (error) {
    if (error instanceof RawHttpError) {
      return NextResponse.json(
        { success: false, message: error.message, request: error.request, data: error.data },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Unexpected integration error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
