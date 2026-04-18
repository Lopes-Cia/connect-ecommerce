import "server-only";

import { getIntegrationEnvConfig } from "./config";
import { fetchWithRetry, HttpError, readResponseData } from "./network";

type SuccessResponse<T> = {
  success: true;
  data: T;
};

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    if ("data" in obj) {
      return obj.data as T;
    }
  }
  return payload as T;
}

function buildIntegrationUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);
  return url.toString();
}

async function integrationPost<T>(path: string, body: unknown): Promise<T> {
  return integrationRequest<T>("POST", path, body);
}

async function integrationRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const { integrationUrlApi } = getIntegrationEnvConfig();
  const url = buildIntegrationUrl(integrationUrlApi, path);

  const init: RequestInit = {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  };

  if (method !== "GET") {
    init.body = JSON.stringify(body ?? {});
  }

  const response = await fetchWithRetry(url, init, { maxAttempts: 3 });
  const data = await readResponseData<T>(response);

  if (!response.ok) {
    throw new HttpError("Integration request failed", response.status, url, data);
  }

  return (data ?? ({} as T)) as T;
}

export async function loginCliente(payload: {
  email: string;
  senha: string;
}): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationPost<unknown>(
    "/Servidor/webservice/integration/clientes/login",
    payload
  );
  const data = unwrapData<unknown>(responsePayload);
  return { success: true, data };
}

export async function updateMeusDadosCliente(payload: {
  clienteId: number;
  patch: Record<string, unknown>;
}): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "PUT",
    "/Servidor/webservice/integration/clientes/meus-dados",
    payload
  );
  const data = unwrapData<unknown>(responsePayload);
  return { success: true, data };
}

export async function updatePrivacidadeCliente(payload: {
  clienteId: number;
  patch: Record<string, unknown>;
}): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "PUT",
    "/Servidor/webservice/integration/clientes/privacidade",
    payload
  );
  const data = unwrapData<unknown>(responsePayload);
  return { success: true, data };
}

export async function listEnderecosCliente(clienteId: number): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "GET",
    `/Servidor/webservice/integration/clientes/enderecos/${encodeURIComponent(String(clienteId))}`
  );
  const data = unwrapData<unknown>(responsePayload);
  return { success: true, data };
}

export async function createEnderecoCliente(payload: {
  clienteId: number;
  endereco: Record<string, unknown>;
}): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "POST",
    "/Servidor/webservice/integration/clientes/enderecos",
    payload
  );
  const data = unwrapData<unknown>(responsePayload);
  return { success: true, data };
}

export async function updateEnderecoCliente(
  enderecoId: number,
  payload: { clienteId?: number; patch: Record<string, unknown> }
): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "PUT",
    `/Servidor/webservice/integration/clientes/enderecos/${encodeURIComponent(String(enderecoId))}`,
    payload
  );
  const data = unwrapData<unknown>(responsePayload);
  return { success: true, data };
}

export async function deleteEnderecoCliente(
  enderecoId: number,
  payload: { clienteId?: number } = {}
): Promise<SuccessResponse<unknown>> {
  const responsePayload = await integrationRequest<unknown>(
    "DELETE",
    `/Servidor/webservice/integration/clientes/enderecos/${encodeURIComponent(String(enderecoId))}`,
    payload
  );
  const data = unwrapData<unknown>(responsePayload);
  return { success: true, data };
}
