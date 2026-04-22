"use client";

import { useEffect, useState } from "react";
import { useClientesStore } from "@/stores/clientes-store";
import { frontModal } from "@/stores/front-modal-store";
import { Button } from "@/components/ui/button";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export default function PrivacidadeClientePage() {
  const loginData = useClientesStore((s) => s.loginData);
  const updatePrivacidade = useClientesStore((s) => s.updatePrivacidade);
  const privacidade = asRecord(loginData?.privacidade) ?? null;
  const [isSaving, setIsSaving] = useState(false);

  const [aceitaMarketing, setAceitaMarketing] = useState(false);
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [aceitaCookies, setAceitaCookies] = useState(false);
  const [canalPreferido, setCanalPreferido] = useState<"" | "email" | "whatsapp">("");
  const [doisFatoresHabilitado, setDoisFatoresHabilitado] = useState(false);
  const [doisFatoresMetodo, setDoisFatoresMetodo] = useState<"email" | "whatsapp">("email");

  useEffect(() => {
    setAceitaMarketing(Boolean(privacidade?.aceitaMarketing));
    setAceitaTermos(Boolean(privacidade?.aceitaTermos));
    setAceitaCookies(Boolean(privacidade?.aceitaCookies));

    const canal = String(privacidade?.canalPreferido ?? "").trim().toLowerCase();
    setCanalPreferido(canal === "email" || canal === "whatsapp" ? (canal as "email" | "whatsapp") : "");

    const doisFatores = asRecord(privacidade?.doisFatores);
    setDoisFatoresHabilitado(Boolean(doisFatores?.habilitado));
    const metodo = String(doisFatores?.metodo ?? "").trim().toLowerCase();
    setDoisFatoresMetodo(metodo === "whatsapp" ? "whatsapp" : "email");
  }, [loginData?.privacidade]);

  return (
    <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-league-spartan font-bold text-custom-dark-1000 sm:text-xl">
          Privacidade
        </h2>
        <p className="mt-1 text-xs font-montserrat text-custom-light-600 sm:text-sm">
          Controle suas preferências e segurança da conta.
        </p>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (isSaving) return;

          const patch: Record<string, unknown> = {
            aceitaMarketing,
            aceitaTermos,
            aceitaCookies,
            ...(canalPreferido ? { canalPreferido } : {}),
            doisFatores: { habilitado: doisFatoresHabilitado, metodo: doisFatoresMetodo },
          };

          setIsSaving(true);
          try {
            await updatePrivacidade(patch);
            frontModal.success({ title: "Privacidade atualizada com sucesso." });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao atualizar privacidade.";
            const normalized = message.trim().toLowerCase();
            const isWarning =
              normalized.includes("json") ||
              normalized.includes("inválid") ||
              normalized.includes("invalid") ||
              normalized.includes("valida");

            if (isWarning) {
              frontModal.warning({ title: message || "Dados inválidos." });
            } else {
              frontModal.error({
                title: "Erro ao atualizar privacidade.",
                description: message && message !== "Erro ao atualizar privacidade." ? message : undefined,
              });
            }
          } finally {
            setIsSaving(false);
          }
        }}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm">
            <h3 className="text-base font-league-spartan font-bold text-custom-dark-1000">
              Preferências
            </h3>
            <p className="mt-1 text-xs font-montserrat text-custom-light-600">
              Ajuste seus consentimentos.
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 rounded-lg border border-custom-light-300 p-3">
                <input
                  type="checkbox"
                  checked={aceitaMarketing}
                  onChange={(e) => setAceitaMarketing(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <div>
                  <div className="text-sm font-montserrat font-semibold text-custom-dark-1000">
                    Marketing
                  </div>
                  <div className="text-[11px] font-montserrat text-custom-light-600">
                    Receber comunicações e ofertas.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-custom-light-300 p-3">
                <input
                  type="checkbox"
                  checked={aceitaTermos}
                  onChange={(e) => setAceitaTermos(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <div>
                  <div className="text-sm font-montserrat font-semibold text-custom-dark-1000">
                    Termos de uso
                  </div>
                  <div className="text-[11px] font-montserrat text-custom-light-600">
                    Aceite dos termos e condições.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-custom-light-300 p-3">
                <input
                  type="checkbox"
                  checked={aceitaCookies}
                  onChange={(e) => setAceitaCookies(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <div>
                  <div className="text-sm font-montserrat font-semibold text-custom-dark-1000">
                    Cookies
                  </div>
                  <div className="text-[11px] font-montserrat text-custom-light-600">
                    Preferências de cookies.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm">
            <h3 className="text-base font-league-spartan font-bold text-custom-dark-1000">
              Segurança e contato
            </h3>
            <p className="mt-1 text-xs font-montserrat text-custom-light-600">
              Defina canal e autenticação adicional.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
                  Canal preferido
                </label>
                <select
                  value={canalPreferido}
                  onChange={(e) => setCanalPreferido((e.target.value as "email" | "whatsapp" | "") || "")}
                  className="mt-1 w-full rounded-md border border-custom-light-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Não definido</option>
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <div className="rounded-lg border border-custom-light-300 p-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={doisFatoresHabilitado}
                    onChange={(e) => setDoisFatoresHabilitado(e.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-montserrat font-semibold text-custom-dark-1000">
                      Autenticação em dois fatores
                    </div>
                    <div className="text-[11px] font-montserrat text-custom-light-600">
                      Ative uma camada extra de segurança.
                    </div>
                  </div>
                </label>

                <div className="mt-3">
                  <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
                    Método
                  </label>
                  <select
                    value={doisFatoresMetodo}
                    onChange={(e) => setDoisFatoresMetodo(e.target.value === "whatsapp" ? "whatsapp" : "email")}
                    className="mt-1 w-full rounded-md border border-custom-light-300 bg-white px-3 py-2 text-sm"
                    disabled={!doisFatoresHabilitado}
                  >
                    <option value="email">E-mail</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button disabled={isSaving} type="submit">
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </section>
  );
}
