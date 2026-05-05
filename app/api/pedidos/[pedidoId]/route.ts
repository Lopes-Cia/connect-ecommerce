import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { getSession } from "@/lib/auth/session";
import { buildPixCopiaECola } from "@/lib/pix/brcode";
import { getPixEnvConfig } from "@/lib/pix/config";
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

function safeInt(value: unknown): number | null {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function normalizeIsoDate(value: unknown): string | null {
  const raw = safeString(value).trim();
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const time = Date.parse(normalized);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

function normalizePagamentoMetodo(value: string): string {
  return value.trim().toLowerCase();
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

async function toPngBase64(payload: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 256 });
  const match = /^data:image\/png;base64,(.+)$/i.exec(dataUrl);
  if (!match?.[1]) {
    throw new Error("QRCode inválido (dataURL).");
  }
  return match[1];
}

function mapGpDadoIntegrationToPedidoDetalhe(value: unknown) {
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

  const enderecoEntrega = {
    rua: safeString(cliente.rua ?? cliente.logradouro ?? cliente.endereco ?? cliente["endereço"]).trim(),
    endereco: safeString(cliente.endereco ?? cliente["endereço"]).trim(),
    numero: safeString(cliente.numero ?? cliente["número"] ?? cliente.num).trim() || null,
    bairro: safeString(cliente.bairro).trim(),
    cep: safeString(cliente.CEP ?? cliente.cep).trim(),
    complemento: safeString(cliente.complemento).trim() || null,
    cidade: safeString(cliente.cidade ?? cliente.municipio ?? cliente["município"]).trim(),
    uf: safeString(cliente.UF ?? cliente.uf).trim(),
  };

  const itensMapped = itens.map((raw) => {
    const it = asRecord(raw) ?? {};
    const quantidade = Math.max(0, Math.floor(safeNumber(it.qt ?? it.quantidade, 0)));
    const precoUnitario = safeNumber(it.valorUnitario ?? it.precoUnitario, 0);
    const subtotal = safeNumber(it.subTotal ?? it.subtotal, precoUnitario * quantidade);
    return {
      itemId: null,
      produtoId: safeInt(it.codProd ?? it.produtoId),
      sku: "",
      slug: "",
      nome: safeString(it.produto ?? it.nome).trim(),
      imagemUrl: "",
      precoUnitario,
      quantidade,
      subtotal,
    };
  });

  const pagamentoMetodo = safeString(payload.planoCodigo ?? payload.pagamentoMetodo ?? "desconhecido").trim();
  const pagamentoStatus = safeString(payload.posicao ?? payload.pagamentoStatus ?? status).trim();

  const entregaCidade = safeString(cliente.cidade ?? cliente.municipio ?? cliente["município"]).trim();
  const entregaUf = safeString(cliente.UF ?? cliente.uf).trim();

  const freteNome = safeString(payload.transportadora ?? payload.freteNome ?? "").trim();
  const fretePreco = Number.isFinite(Number(payload.valorFrete)) ? safeNumber(payload.valorFrete, 0) : null;

  const pixConfig = getPixEnvConfig();
  const isPix = normalizePagamentoMetodo(pagamentoMetodo).includes("pix");
  const pix =
    pixConfig && isPix
      ? {
          copiaECola: buildPixCopiaECola({
            pixKey: pixConfig.key,
            merchantName: pixConfig.merchantName,
            merchantCity: pixConfig.merchantCity,
            txid: String(pedidoId),
            amount: total,
            description: `Pedido ${pedidoId}`,
          }),
          expiresAt: null,
          qrCodeBase64: null,
        }
      : null;

  return {
    pedidoId,
    checkoutId: null,
    createdAt,
    status,
    total,
    moeda,
    itensCount: itensMapped.length,
    itensQuantidade: itensMapped.reduce((acc, it) => acc + (Number.isFinite(it.quantidade) ? it.quantidade : 0), 0),
    pagamentoMetodo,
    pagamentoStatus,
    entregaCidade,
    entregaUf,
    freteNome,
    fretePrazoDias: null,
    fretePreco,
    raw: { ...item, payload: payloadParsed ?? item.payload },
    enderecoEntrega,
    pix,
    itens: itensMapped,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ pedidoId: string }> }
) {
  try {
    const { pedidoId } = await context.params;
    const parsedPedidoId = Number.parseInt(pedidoId, 10);
    if (!Number.isFinite(parsedPedidoId)) {
      return NextResponse.json({ success: false, message: "pedidoId invalido." }, { status: 400 });
    }

    const session = await getSession();
    const cgc = session?.cliente?.cnpj ? String(session.cliente.cnpj).trim() : "";
    if (!cgc) {
      return NextResponse.json({ success: false, message: "Sessão inválida. Faça login novamente." }, { status: 401 });
    }

    const result = await integrationRawGetJsonServerToken<unknown>(PEDIDOS_INTEGRATION_ROUTES.getDadoIntegration, {
      tipo: "OrderLopes",
      orderId: String(parsedPedidoId),
    });

    const root = asRecord(result.data);
    const dataRaw = root?.data ?? result.data;
    const detalhe = mapGpDadoIntegrationToPedidoDetalhe(dataRaw);
    if (!Number.isFinite(detalhe.pedidoId) || detalhe.pedidoId <= 0) {
      return NextResponse.json({ success: false, message: "Pedido não encontrado." }, { status: 404 });
    }
    if (detalhe.pix?.copiaECola && !detalhe.pix.qrCodeBase64) {
      detalhe.pix.qrCodeBase64 = await toPngBase64(detalhe.pix.copiaECola);
    }
    return NextResponse.json({ success: true, request: result.request, data: detalhe });
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
