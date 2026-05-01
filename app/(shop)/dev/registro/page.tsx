"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import { AUTH_API_ROUTES } from "@/liz_refator/integration/integrationRoutes";
import clienteTesteDefault from "@/liz_refator/integration/cliente_teste_4.json";

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

function parseJsonBody(text: string): { value: unknown; error: string | null } {
  try {
    return { value: JSON.parse(text || "{}") as unknown, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { value: { error: message }, error: message };
  }
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

function buildDefaultOperadorBody(args: { nome: string; telefone: string; email: string }) {
  return {
    status: 1,
    qt: 1,
    idFilial: 1,
    grupo: "Usuário",
    nivel: "Junior",
    nome: args.nome,
    telefone: args.telefone,
    email: args.email,
  };
}

function buildDefaultVinculoBody(args: { idUsuario: number; cnpj: string }) {
  return {
    idUsuario: args.idUsuario,
    cnpj: args.cnpj,
  };
}

export default function DevRegistroPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [idUsuario, setIdUsuario] = useState<number>(0);
  const [responses, setResponses] = useState<{
    getVinculoInicio: CallResult | null;
    insertOperadorSistema: CallResult | null;
    getOperadorSistema: CallResult | null;
    insertVinculoUsuarioSite: CallResult | null;
    getVinculoFim: CallResult | null;
  }>({
    getVinculoInicio: null,
    insertOperadorSistema: null,
    getOperadorSistema: null,
    insertVinculoUsuarioSite: null,
    getVinculoFim: null,
  });

  const [params, setParams] = useState(() => ({
    nome: String((clienteTesteDefault as UnknownRecord).responsavel ?? "").trim(),
    email: String((clienteTesteDefault as UnknownRecord).email ?? "").trim(),
    whatsapp: String((clienteTesteDefault as UnknownRecord).whatsapp ?? "").trim(),
    cnpj: String((clienteTesteDefault as UnknownRecord).cnpj ?? "").trim(),
  }));

  const [formBody, setFormBody] = useState(() => JSON.stringify(clienteTesteDefault, null, 2));

  const [operadorBody, setOperadorBody] = useState(() =>
    JSON.stringify(
      buildDefaultOperadorBody({ nome: params.nome, telefone: params.whatsapp, email: params.email }),
      null,
      2
    )
  );

  const [vinculoBody, setVinculoBody] = useState(() =>
    JSON.stringify(buildDefaultVinculoBody({ idUsuario: 0, cnpj: params.cnpj }), null, 2)
  );

  const getVinculoUrl = useMemo(
    () =>
      "/api/dev/liz-refator/raw/auth/get-vinculo-usuario-site" +
      buildQueryString({ email: params.email, cnpj: params.cnpj }),
    [params.email, params.cnpj]
  );

  function prettyJson(value: unknown): string {
    if (value === null || value === undefined) return "—";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  const cards = useMemo(
    () => [
      {
        key: "getVinculoInicio" as const,
        title: "getVinculoUsuarioSite (início)",
        endpoint: AUTH_API_ROUTES.getVinculoUsuarioSite,
        request: { email: params.email || undefined, cnpj: params.cnpj || undefined },
        response: responses.getVinculoInicio?.payload ?? null,
        disabled: !params.email || !params.cnpj,
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
              <div className="text-xs font-montserrat text-custom-dark-700">cnpj</div>
              <input
                value={params.cnpj}
                onChange={(e) => setParams((p) => ({ ...p, cnpj: e.target.value }))}
                className="h-10 px-3 rounded-md border border-custom-light-300 bg-white font-montserrat text-sm text-custom-dark-1000"
                placeholder="ex: 00000000000199"
              />
            </label>
          </div>
        ),
        onRun: async () => {
          setLoading("getVinculoInicio");
          try {
            const next = await callApi(getVinculoUrl, { method: "GET" });
            setResponses((p) => ({ ...p, getVinculoInicio: next }));
          } finally {
            setLoading(null);
          }
        },
      },
      {
        key: "insertOperadorSistema" as const,
        title: "insertOperadorSistema",
        endpoint: AUTH_API_ROUTES.insertOperadorSistema,
        request: (() => {
          try {
            return JSON.parse(operadorBody || "{}") as unknown;
          } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid JSON";
            return { error: message };
          }
        })(),
        response: responses.insertOperadorSistema?.payload ?? null,
        disabled: false,
        requestUi: (
          <div className="grid grid-cols-1 gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-montserrat text-custom-dark-700">
                Env (server): Authorization + base do Auth via .env
              </div>
              <button
                type="button"
                onClick={() => {
                  setOperadorBody(
                    JSON.stringify(
                      buildDefaultOperadorBody({
                        nome: params.nome,
                        telefone: params.whatsapp,
                        email: params.email,
                      }),
                      null,
                      2
                    )
                  );
                }}
                className="h-9 inline-flex items-center rounded-md border border-custom-light-300 bg-white px-3 font-montserrat text-xs font-semibold text-custom-dark-1000 hover:bg-custom-light-100"
              >
                Gerar payload
              </button>
            </div>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">body (JSON)</div>
              <textarea
                value={operadorBody}
                onChange={(e) => setOperadorBody(e.target.value)}
                className="min-h-40 px-3 py-2 rounded-md border border-custom-light-300 bg-white font-mono text-xs text-custom-dark-1000"
                spellCheck={false}
              />
            </label>
          </div>
        ),
        onRun: async () => {
          setLoading("insertOperadorSistema");
          try {
            const parsed = parseJsonBody(operadorBody);
            if (parsed.error) {
              setResponses((p) => ({
                ...p,
                insertOperadorSistema: {
                  url: "(local)",
                  method: "POST",
                  status: 400,
                  ok: false,
                  payload: parsed.value,
                },
              }));
              return;
            }
            const url = "/api/dev/liz-refator/raw/auth/insert-operador-sistema";
            const next = await callApi(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(parsed.value),
            });
            setResponses((p) => ({ ...p, insertOperadorSistema: next }));
          } finally {
            setLoading(null);
          }
        },
      },
      {
        key: "getOperadorSistema" as const,
        title: "getOperadorSistema",
        endpoint: AUTH_API_ROUTES.getOperadorSistema,
        request: { email: params.email || undefined },
        response: responses.getOperadorSistema?.payload ?? null,
        disabled: !params.email,
        requestUi: null,
        onRun: async () => {
          setLoading("getOperadorSistema");
          try {
            const url =
              "/api/dev/liz-refator/raw/auth/get-operador-sistema" + buildQueryString({ email: params.email });
            const next = await callApi(url, { method: "GET" });
            const record = asRecord(next.payload);
            const data = record && "data" in record ? record.data : null;
            const dataRecord = asRecord(data);
            const dataArray = Array.isArray(data) ? data : null;
            const firstArrayRecord = dataArray ? asRecord(dataArray[0]) : null;
            const id =
              (dataRecord && typeof dataRecord.id === "number" ? dataRecord.id : null) ??
              (firstArrayRecord && typeof firstArrayRecord.id === "number" ? firstArrayRecord.id : null);
            if (typeof id === "number") {
              setIdUsuario(id);
              setVinculoBody(JSON.stringify(buildDefaultVinculoBody({ idUsuario: id, cnpj: params.cnpj }), null, 2));
            }
            setResponses((p) => ({ ...p, getOperadorSistema: next }));
          } finally {
            setLoading(null);
          }
        },
      },
      {
        key: "insertVinculoUsuarioSite" as const,
        title: "insertVinculoUsuarioSite",
        endpoint: AUTH_API_ROUTES.insertVinculoUsuarioSite,
        request: (() => {
          try {
            return JSON.parse(vinculoBody || "{}") as unknown;
          } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid JSON";
            return { error: message };
          }
        })(),
        response: responses.insertVinculoUsuarioSite?.payload ?? null,
        disabled: idUsuario <= 0 || !params.cnpj,
        requestUi: (
          <div className="grid grid-cols-1 gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-montserrat text-custom-dark-700">
                Env (server): idIntegradora (não vem do client)
              </div>
              <button
                type="button"
                onClick={() => {
                  setVinculoBody(JSON.stringify(buildDefaultVinculoBody({ idUsuario, cnpj: params.cnpj }), null, 2));
                }}
                className="h-9 inline-flex items-center rounded-md border border-custom-light-300 bg-white px-3 font-montserrat text-xs font-semibold text-custom-dark-1000 hover:bg-custom-light-100"
              >
                Gerar payload
              </button>
            </div>
            <div className="text-xs font-montserrat text-custom-dark-700">idUsuario atual: {idUsuario || "—"}</div>
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">body (JSON)</div>
              <textarea
                value={vinculoBody}
                onChange={(e) => setVinculoBody(e.target.value)}
                className="min-h-32 px-3 py-2 rounded-md border border-custom-light-300 bg-white font-mono text-xs text-custom-dark-1000"
                spellCheck={false}
              />
            </label>
          </div>
        ),
        onRun: async () => {
          setLoading("insertVinculoUsuarioSite");
          try {
            const parsed = parseJsonBody(vinculoBody);
            if (parsed.error) {
              setResponses((p) => ({
                ...p,
                insertVinculoUsuarioSite: {
                  url: "(local)",
                  method: "POST",
                  status: 400,
                  ok: false,
                  payload: parsed.value,
                },
              }));
              return;
            }
            const url = "/api/dev/liz-refator/raw/auth/insert-vinculo-usuario-site";
            const next = await callApi(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(parsed.value),
            });
            setResponses((p) => ({ ...p, insertVinculoUsuarioSite: next }));
          } finally {
            setLoading(null);
          }
        },
      },
      {
        key: "getVinculoFim" as const,
        title: "getVinculoUsuarioSite (fim)",
        endpoint: AUTH_API_ROUTES.getVinculoUsuarioSite,
        request: { email: params.email || undefined, cnpj: params.cnpj || undefined },
        response: responses.getVinculoFim?.payload ?? null,
        disabled: !params.email || !params.cnpj,
        requestUi: null,
        onRun: async () => {
          setLoading("getVinculoFim");
          try {
            const next = await callApi(getVinculoUrl, { method: "GET" });
            setResponses((p) => ({ ...p, getVinculoFim: next }));
          } finally {
            setLoading(null);
          }
        },
      },
    ],
    [getVinculoUrl, idUsuario, operadorBody, params, responses, vinculoBody]
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-custom-light-100 to-custom-light-300 px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-xl border border-custom-light-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-montserrat font-semibold text-custom-dark-1000">Dev — Registro (Auth)</h1>
            <Link
              href="/dev"
              className="h-9 inline-flex items-center rounded-md border border-custom-light-300 bg-white px-3 font-montserrat text-sm font-semibold text-custom-dark-1000 hover:bg-custom-light-100"
            >
              Voltar
            </Link>
          </div>
          <p className="text-sm font-montserrat text-custom-dark-700">
            Fluxo passo a passo do Auth, com validação de vínculo no início e no fim.
          </p>
        </div>

        <div className="rounded-xl border border-custom-light-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-[240px]">
              <div className="text-xs font-montserrat font-semibold uppercase tracking-wide text-custom-dark-700">
                Cliente de teste (default)
              </div>
              <div className="mt-1 text-sm font-montserrat text-custom-dark-1000">
                <span className="font-semibold">Fonte:</span>{" "}
                <span className="font-mono text-[13px]">liz_refator/integration/cliente_teste_4.json</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormBody(JSON.stringify(clienteTesteDefault, null, 2));
                const record = asRecord(clienteTesteDefault) ?? {};
                const nextNome = String(record.responsavel ?? "").trim();
                const nextEmail = String(record.email ?? "").trim();
                const nextWhatsapp = String(record.whatsapp ?? "").trim();
                const nextCnpj = String(record.cnpj ?? "").trim();
                setParams({ nome: nextNome, email: nextEmail, whatsapp: nextWhatsapp, cnpj: nextCnpj });
                setOperadorBody(
                  JSON.stringify(buildDefaultOperadorBody({ nome: nextNome, telefone: nextWhatsapp, email: nextEmail }), null, 2)
                );
                setVinculoBody(JSON.stringify(buildDefaultVinculoBody({ idUsuario: 0, cnpj: nextCnpj }), null, 2));
                setIdUsuario(0);
              }}
              className="h-9 inline-flex items-center rounded-md border border-custom-light-300 bg-white px-3 font-montserrat text-xs font-semibold text-custom-dark-1000 hover:bg-custom-light-100"
            >
              Reset default
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <label className="grid gap-1">
              <div className="text-xs font-montserrat text-custom-dark-700">form (JSON)</div>
              <textarea
                value={formBody}
                onChange={(e) => {
                  const next = e.target.value;
                  setFormBody(next);
                  try {
                    const parsed = JSON.parse(next || "{}") as UnknownRecord;
                    setParams((p) => ({
                      ...p,
                      nome: String(parsed.responsavel ?? "").trim(),
                      email: String(parsed.email ?? "").trim(),
                      whatsapp: String(parsed.whatsapp ?? "").trim(),
                      cnpj: String(parsed.cnpj ?? "").trim(),
                    }));
                  } catch {
                  }
                }}
                className="min-h-40 px-3 py-2 rounded-md border border-custom-light-300 bg-white font-mono text-xs text-custom-dark-1000"
                spellCheck={false}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {cards.map((card) => (
            <Fragment key={card.key}>
              <div className="rounded-xl border border-custom-light-300 bg-white p-4 shadow-sm">
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

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={card.onRun}
                    disabled={Boolean(loading) || card.disabled}
                    className="min-h-10 px-3 py-2 rounded-md bg-tints-french-blue text-white font-montserrat text-sm font-semibold disabled:opacity-60"
                  >
                    {loading === card.key ? `Carregando... ${card.title}` : `EXECUTAR ${card.title}`}
                  </button>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

