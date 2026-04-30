"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CLIENTES_API_ROUTES } from "@/liz_refator/integration/integrationRoutes";
import clienteNovoForm from "@/liz_refator/integration/clienteNovoForm.json";

type CallResult = {
  url: string;
  method: string;
  status: number;
  ok: boolean;
  payload: unknown;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function buildQueryString(params: Record<string, string>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const trimmed = value.trim();
    if (trimmed) usp.set(key, trimmed);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

async function callApi(url: string, init: RequestInit): Promise<CallResult> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
    ...init,
  });

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  return {
    url,
    method: String(init.method ?? "GET").toUpperCase(),
    status: response.status,
    ok: response.ok,
    payload,
  };
}

function parseJsonBody(text: string): { value: unknown; error: string | null } {
  try {
    return { value: JSON.parse(text || "{}") as unknown, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { value: { error: message }, error: message };
  }
}

export default function DevClientesPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [customerId, setCustomerId] = useState<number>(0);
  const [responses, setResponses] = useState<{
    enviarToken: CallResult | null;
    verificarToken: CallResult | null;
    getClienteLoja: CallResult | null;
    getProximoCustomerIdIntegrado: CallResult | null;
    insertClienteLoja: CallResult | null;
  }>({
    enviarToken: null,
    verificarToken: null,
    getClienteLoja: null,
    getProximoCustomerIdIntegrado: null,
    insertClienteLoja: null,
  });
  const [params, setParams] = useState({
    email: "",
    whatsapp: "",
    cgc: clienteNovoForm.cnpj,
  });
  const [clienteNovoFormBody, setClienteNovoFormBody] = useState(() => JSON.stringify(clienteNovoForm, null, 2));
  const [insertClienteLojaBody, setInsertClienteLojaBody] = useState(() => {
    const base = clienteNovoForm
    const normalizeNullable = (value: unknown): string | null => {
      const trimmed = String(value ?? "").trim()
      return trimmed ? trimmed : null
    }
    const payload = {
      limCred: 0,
      cliente: String(base.responsavel ?? "").trim(),
      fantasia: String(base.fantasia ?? "").trim(),
      cgc: String(base.cnpj ?? "").trim(),
      inscicao: String(base.inscicao ?? "").trim(),
      email: String(base.email ?? "").trim(),
      telefone: String(base.whatsapp ?? "").trim(),
      status: "PEN",
      idTabPreco: 1,
      customerId: 0,
      enderecos: [
        {
          customerId: 0,
          codigoIbge: 0,
          rua: String(base.rua ?? "").trim(),
          numero: normalizeNullable((base as UnknownRecord).numero),
          complemento: normalizeNullable((base as UnknownRecord).complemento),
          bairro: String(base.bairro ?? "").trim(),
          cep: String(base.cep ?? "").trim(),
          municipio: String(base.municipio ?? "").trim(),
          uf: String(base.uf ?? "").trim(),
          principal: "Sim",
        },
      ],
    }
    return JSON.stringify(payload, null, 2)
  });

  const enviarTokenUrl = useMemo(
    () =>
      "/api/dev/liz-refator/raw/usuarios/enviar-token" +
      buildQueryString({ email: params.email, whatsapp: params.whatsapp }),
    [params.email, params.whatsapp]
  );

  const verificarTokenUrl = useMemo(
    () =>
      "/api/dev/liz-refator/raw/usuarios/verificar-token" +
      buildQueryString({ token }),
    [token]
  );

  const enviarTokenRequest = useMemo(
    () => ({ email: params.email || undefined, whatsapp: params.whatsapp || undefined }),
    [params.email, params.whatsapp]
  );

  const verificarTokenRequest = useMemo(() => ({ token }), [token]);
  const getClienteLojaRequest = useMemo(() => ({ cgc: params.cgc || undefined }), [params.cgc]);
  const getProximoCustomerIdIntegradoRequest = useMemo(() => ({}), []);
  const clienteNovoFormRequest = useMemo(() => {
    try {
      return JSON.parse(clienteNovoFormBody || "{}") as unknown;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      return { error: message };
    }
  }, [clienteNovoFormBody]);
  const insertClienteLojaRequest = useMemo(() => {
    try {
      return JSON.parse(insertClienteLojaBody || "{}") as unknown;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      return { error: message };
    }
  }, [insertClienteLojaBody]);

  const cards = useMemo(
    () => [
      {
        key: "enviarToken" as const,
        title: "enviarToken",
        endpoint: CLIENTES_API_ROUTES.enviarToken,
        request: enviarTokenRequest,
        response: responses.enviarToken?.payload ?? null,
        disabled: false,
        requestUi: (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">email</div>
              <input
                value={params.email}
                onChange={(e) => setParams((p) => ({ ...p, email: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: user@dominio.com"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">whatsapp</div>
              <input
                value={params.whatsapp}
                onChange={(e) => setParams((p) => ({ ...p, whatsapp: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: 62999999999"
              />
            </label>
          </div>
        ),
        onRun: async () => {
          setLoading("enviarToken");
          try {
            const next = await callApi(enviarTokenUrl, { method: "POST" });
            const payload = next.payload as { data?: unknown } | null;
            const nextToken = payload && typeof payload === "object" ? payload.data : null;
            if (typeof nextToken === "string") setToken(nextToken);
            setResponses((p) => ({ ...p, enviarToken: next }));
          } finally {
            setLoading(null);
          }
        },
      },
      {
        key: "verificarToken" as const,
        title: "verificarTokenSistema",
        endpoint: CLIENTES_API_ROUTES.verificarToken,
        request: verificarTokenRequest,
        response: responses.verificarToken?.payload ?? null,
        disabled: !token,
        requestUi: (
          <div className="grid grid-cols-1 gap-3">
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">token</div>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
              />
            </label>
          </div>
        ),
        onRun: async () => {
          setLoading("verificarToken");
          try {
            const next = await callApi(verificarTokenUrl, { method: "POST" });
            setResponses((p) => ({ ...p, verificarToken: next }));
          } finally {
            setLoading(null);
          }
        },
      },
      {
        key: "getClienteLoja" as const,
        title: "getClienteLoja",
        endpoint: CLIENTES_API_ROUTES.getClienteLoja,
        request: getClienteLojaRequest,
        response: responses.getClienteLoja?.payload ?? null,
        disabled: false,
        requestUi: (
          <div className="grid grid-cols-1 gap-3">
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">cgc (cnpj)</div>
              <input
                value={params.cgc}
                onChange={(e) => setParams((p) => ({ ...p, cgc: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: 00000000000199"
              />
            </label>
          </div>
        ),
        onRun: async () => {
          setLoading("getClienteLoja");
          try {
            const url = "/api/dev/liz-refator/raw/clientes/get-cliente-loja" + buildQueryString({ cgc: params.cgc });
            const next = await callApi(url, { method: "GET" });
            setResponses((p) => ({ ...p, getClienteLoja: next }));
          } finally {
            setLoading(null);
          }
        },
      },
      {
        key: "getProximoCustomerIdIntegrado" as const,
        title: "getProximoCustomerIdIntegrado",
        endpoint: CLIENTES_API_ROUTES.getProximoCustomerIdIntegrado,
        request: getProximoCustomerIdIntegradoRequest,
        response: responses.getProximoCustomerIdIntegrado?.payload ?? null,
        disabled: false,
        requestUi: null,
        onRun: async () => {
          setLoading("getProximoCustomerIdIntegrado");
          try {
            const url = "/api/dev/liz-refator/raw/clientes/get-proximo-customer-id-integrado";
            const next = await callApi(url, { method: "GET" });
            const record = asRecord(next.payload);
            const data = record && "data" in record ? record.data : null;
            if (typeof data === "number") setCustomerId(data);
            setResponses((p) => ({ ...p, getProximoCustomerIdIntegrado: next }));
          } finally {
            setLoading(null);
          }
        },
      },
      {
        key: "insertClienteLoja" as const,
        title: "insertClienteLoja",
        endpoint: CLIENTES_API_ROUTES.insertClienteLoja,
        request: insertClienteLojaRequest,
        response: responses.insertClienteLoja?.payload ?? null,
        disabled: false,
        requestUi: (
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-montserrat text-custom-dark-700">
                Form: <span className="font-mono">responsavel/fantasia/cnpj/inscicao/email/whatsapp</span> + Endereço
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1 text-[11px] font-montserrat text-custom-dark-700">
              <div>
                Gerado/default: <span className="font-mono">status=\"PEN\"</span>, <span className="font-mono">principal=\"Sim\"</span>,{" "}
                <span className="font-mono">idTabPreco=1</span>, <span className="font-mono">codigoIbge=0</span>,{" "}
                <span className="font-mono">customerId</span> (vem do getProximoCustomerIdIntegrado)
              </div>
              <div>
                Env (server): <span className="font-mono">idIntegradora</span> (não vem do client)
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-montserrat text-custom-dark-700">
                customerId atual: <span className="font-mono">{customerId || 0}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setClienteNovoFormBody(JSON.stringify(clienteNovoForm, null, 2))}
                  className="h-9 inline-flex items-center rounded-md border border-custom-light-300 bg-white px-3 font-montserrat text-xs font-semibold text-custom-dark-1000 hover:bg-custom-light-100"
                >
                  Reset form
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const form = clienteNovoFormRequest as UnknownRecord
                    const normalizeNullable = (value: unknown): string | null => {
                      const trimmed = String(value ?? "").trim()
                      return trimmed ? trimmed : null
                    }
                    const payload = {
                      limCred: 0,
                      cliente: String(form.responsavel ?? "").trim(),
                      fantasia: String(form.fantasia ?? "").trim(),
                      cgc: String(form.cnpj ?? "").trim(),
                      inscicao: String(form.inscicao ?? "").trim(),
                      email: String(form.email ?? "").trim(),
                      telefone: String(form.whatsapp ?? "").trim(),
                      status: "PEN",
                      idTabPreco: 1,
                      customerId: customerId || 0,
                      enderecos: [
                        {
                          customerId: customerId || 0,
                          codigoIbge: 0,
                          rua: String(form.rua ?? "").trim(),
                          numero: normalizeNullable(form.numero),
                          complemento: normalizeNullable(form.complemento),
                          bairro: String(form.bairro ?? "").trim(),
                          cep: String(form.cep ?? "").trim(),
                          municipio: String(form.municipio ?? "").trim(),
                          uf: String(form.uf ?? "").trim(),
                          principal: "Sim",
                        },
                      ],
                    }
                    setInsertClienteLojaBody(JSON.stringify(payload, null, 2))
                  }}
                  className="h-9 inline-flex items-center rounded-md bg-tints-french-blue px-3 font-montserrat text-xs font-semibold text-white hover:opacity-95"
                >
                  Gerar payload
                </button>
              </div>
            </div>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">form (JSON)</div>
              <textarea
                value={clienteNovoFormBody}
                onChange={(e) => setClienteNovoFormBody(e.target.value)}
                className="min-h-40 px-3 py-2 rounded-md border border-custom-light-300 bg-white font-mono text-xs text-custom-dark-1000"
                spellCheck={false}
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">body (JSON)</div>
              <textarea
                value={insertClienteLojaBody}
                onChange={(e) => setInsertClienteLojaBody(e.target.value)}
                className="min-h-40 px-3 py-2 rounded-md border border-custom-light-300 bg-white font-mono text-xs text-custom-dark-1000"
                spellCheck={false}
              />
            </label>
          </div>
        ),
        onRun: async () => {
          setLoading("insertClienteLoja");
          try {
            const parsed = parseJsonBody(insertClienteLojaBody);
            if (parsed.error) {
              setResponses((p) => ({
                ...p,
                insertClienteLoja: {
                  url: "(local)",
                  method: "POST",
                  status: 400,
                  ok: false,
                  payload: parsed.value,
                },
              }));
              return;
            }
            const url = "/api/dev/liz-refator/raw/clientes/insert-cliente-loja";
            const next = await callApi(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(parsed.value),
            });
            setResponses((p) => ({ ...p, insertClienteLoja: next }));
          } finally {
            setLoading(null);
          }
        },
      },
    ],
    [
      enviarTokenRequest,
      enviarTokenUrl,
      getClienteLojaRequest,
      getProximoCustomerIdIntegradoRequest,
      clienteNovoFormBody,
      clienteNovoFormRequest,
      customerId,
      insertClienteLojaBody,
      insertClienteLojaRequest,
      params.cgc,
      responses,
      token,
      verificarTokenRequest,
      verificarTokenUrl,
    ]
  );

  function prettyJson(value: unknown): string {
    if (value === null || value === undefined) return "—";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-custom-light-100 to-custom-light-300 px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-xl border border-custom-light-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-montserrat font-semibold text-custom-dark-1000">Dev — Clientes</h1>
            <Link
              href="/dev"
              className="h-9 inline-flex items-center rounded-md border border-custom-light-300 bg-white px-3 font-montserrat text-sm font-semibold text-custom-dark-1000 hover:bg-custom-light-100"
            >
              Voltar
            </Link>
          </div>
          <p className="text-sm font-montserrat text-custom-dark-700">
            Testes de autenticação (enviar token / verificar token) via rotas RAW.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {cards.map((card) => (
            <div key={card.key} className="rounded-xl border border-custom-light-300 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[240px]">
                  <div className="text-xs font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700">
                    {card.title}
                  </div>
                  <div className="mt-1 text-sm font-montserrat text-custom-dark-1000">
                    <span className="font-semibold">End-point:</span>{" "}
                    <span className="font-mono text-[13px]">{card.endpoint}</span>
                  </div>
                </div>
                <button
                  onClick={card.onRun}
                  disabled={Boolean(loading) || card.disabled}
                  className="min-h-10 px-3 py-2 rounded-md bg-tints-french-blue text-white font-montserrat text-sm font-semibold disabled:opacity-60"
                >
                  {loading === card.key ? "Carregando..." : "Executar"}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-lg border border-custom-light-300 bg-custom-light-100 p-3">
                  <div className="text-xs font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700 mb-2">
                    JSON Request
                  </div>
                  {card.requestUi ? <div className="mb-3">{card.requestUi}</div> : null}
                  <pre className="text-xs overflow-auto">{prettyJson(card.request)}</pre>
                </div>
                <div className="rounded-lg border border-custom-light-300 bg-custom-light-100 p-3">
                  <div className="text-xs font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700 mb-2">
                    JSON Response
                  </div>
                  <pre className="text-xs overflow-auto">{prettyJson(card.response)}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
