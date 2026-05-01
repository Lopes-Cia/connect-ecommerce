import "server-only";

import { getIntegrationEnvConfig } from "./config";
import { ensureAuthWebserviceToken } from "./authWebserviceClient";
import { fetchWithRetry, HttpError, readResponseData } from "./network";
import { toRawToken } from "./token";

type SuccessResponse<T> = {
  success: true;
  data: T;
};

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    if ("data" in obj) return obj.data as T;
  }
  return payload as T;
}

function buildIntegrationUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  let normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (/\/Servidor$/i.test(normalizedBase) && /^\/Servidor\//i.test(normalizedPath)) {
    normalizedPath = normalizedPath.slice("/Servidor".length);
  }

  const url = new URL(`${normalizedBase}${normalizedPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function isMockFonte(): boolean {
  return String(process.env.NEXT_PUBLIC_FONTE ?? "").toLowerCase() === "mock";
}

async function integrationRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  query?: Record<string, string | number | boolean | null | undefined>
): Promise<T> {
  const { integrationUrlApi } = getIntegrationEnvConfig();
  const url = buildIntegrationUrl(integrationUrlApi, path, query);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (!isMockFonte()) {
    const token = await ensureAuthWebserviceToken({ backgroundRefresh: true });
    headers.Authorization = toRawToken(token.hashToken);
  }

  const init: RequestInit = {
    method,
    headers,
  };
  if (method !== "GET") init.body = JSON.stringify(body ?? {});

  const response = await fetchWithRetry(url, init, { maxAttempts: 3 });
  const data = await readResponseData<T>(response);
  if (!response.ok) {
    throw new HttpError("Integration request failed", response.status, url, data);
  }
  return (data ?? ({} as T)) as T;
}

export async function getCarrinho(clienteId: number): Promise<SuccessResponse<unknown>> {
  const payload = await integrationRequest<unknown>(
    "GET",
    `/Servidor/webservice/integration/carrinho/${encodeURIComponent(String(clienteId))}`
  );
  return { success: true, data: unwrapData(payload) };
}

export async function addCarrinhoItem(payload: {
  clienteId: number;
  item: { produtoId: number; quantidade: number };
}): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "POST",
    "/Servidor/webservice/integration/carrinho/itens",
    payload
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function updateCarrinhoItem(
  itemId: number,
  payload: { clienteId: number; patch: { quantidade: number } }
): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "PUT",
    `/Servidor/webservice/integration/carrinho/itens/${encodeURIComponent(String(itemId))}`,
    payload
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function deleteCarrinhoItem(
  itemId: number,
  payload: { clienteId: number }
): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "DELETE",
    `/Servidor/webservice/integration/carrinho/itens/${encodeURIComponent(String(itemId))}`,
    payload
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function applyCupom(payload: {
  clienteId: number;
  codigo: string;
}): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "POST",
    "/Servidor/webservice/integration/carrinho/cupom",
    payload
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function removeCupom(payload: { clienteId: number }): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "DELETE",
    "/Servidor/webservice/integration/carrinho/cupom",
    payload
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function createCheckoutSessao(payload: {
  clienteId: number;
  contato?: Record<string, unknown>;
  enderecoEntrega?: Record<string, unknown>;
}): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "POST",
    "/Servidor/webservice/integration/checkout/sessoes",
    payload
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function getCheckoutSessao(checkoutId: number): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "GET",
    `/Servidor/webservice/integration/checkout/sessoes/${encodeURIComponent(String(checkoutId))}`
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function updateCheckoutContato(
  checkoutId: number,
  payload: { patch: Record<string, unknown> }
): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "PUT",
    `/Servidor/webservice/integration/checkout/sessoes/${encodeURIComponent(String(checkoutId))}/contato`,
    payload
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function setCheckoutEndereco(
  checkoutId: number,
  payload: { endereco: Record<string, unknown> }
): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "PUT",
    `/Servidor/webservice/integration/checkout/sessoes/${encodeURIComponent(String(checkoutId))}/entrega/endereco`,
    payload
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function listFreteOpcoes(
  checkoutId: number,
  cep?: string
): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "GET",
    `/Servidor/webservice/integration/checkout/sessoes/${encodeURIComponent(
      String(checkoutId)
    )}/entrega/frete/opcoes`,
    undefined,
    { cep: cep || undefined }
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function setFreteSelecionado(
  checkoutId: number,
  payload: { codigo: string }
): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "PUT",
    `/Servidor/webservice/integration/checkout/sessoes/${encodeURIComponent(
      String(checkoutId)
    )}/entrega/frete`,
    payload
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function createPix(
  checkoutId: number,
  payload: { ttlMinutos?: number } = {}
): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "POST",
    `/Servidor/webservice/integration/checkout/sessoes/${encodeURIComponent(
      String(checkoutId)
    )}/pagamento/pix`,
    payload
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function confirmPix(checkoutId: number): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "POST",
    `/Servidor/webservice/integration/checkout/sessoes/${encodeURIComponent(
      String(checkoutId)
    )}/pagamento/pix/confirmar`,
    {}
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function finalizarCheckout(checkoutId: number): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "POST",
    `/Servidor/webservice/integration/checkout/sessoes/${encodeURIComponent(
      String(checkoutId)
    )}/finalizar`,
    {}
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function getPedido(pedidoId: number): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "GET",
    `/Servidor/webservice/integration/pedidos/${encodeURIComponent(String(pedidoId))}`
  );
  return { success: true, data: unwrapData(responsePayload) };
}

export async function listPedidos(payload: {
  clienteId: number;
  page?: number;
  pageSize?: number;
}): Promise<{
  success: true;
  data: unknown;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> {
  const responsePayload = await integrationRequest<unknown>(
    "GET",
    "/Servidor/webservice/integration/pedidos",
    undefined,
    {
      clienteId: payload.clienteId,
      page: payload.page ?? 1,
      pageSize: payload.pageSize ?? 20,
    }
  );
  if (!responsePayload || typeof responsePayload !== "object" || Array.isArray(responsePayload)) {
    return {
      success: true,
      data: responsePayload,
      page: payload.page ?? 1,
      pageSize: payload.pageSize ?? 20,
      total: Array.isArray(responsePayload) ? responsePayload.length : 0,
      totalPages: 1,
    };
  }
  const obj = responsePayload as Record<string, unknown>;
  return {
    success: true,
    data: obj.data ?? [],
    page: Number(obj.page ?? payload.page ?? 1),
    pageSize: Number(obj.pageSize ?? payload.pageSize ?? 20),
    total: Number(obj.total ?? 0),
    totalPages: Number(obj.totalPages ?? 0),
  };
}
