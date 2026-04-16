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
  const { integrationUrlApi } = getIntegrationEnvConfig();
  const url = buildIntegrationUrl(integrationUrlApi, path);

  const response = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
    { maxAttempts: 3 }
  );

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

