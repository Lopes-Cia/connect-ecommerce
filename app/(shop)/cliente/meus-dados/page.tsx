"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { pickMeusDados, useClientesStore } from "@/stores/clientes-store";
import { frontModal } from "@/stores/front-modal-store";
import { Button } from "@/components/ui/button";

function safeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

export default function MeusDadosPage() {
  const loginData = useClientesStore((s) => s.loginData);
  const updateMeusDados = useClientesStore((s) => s.updateMeusDados);
  const cliente = pickMeusDados(loginData);

  const [tipoPessoa, setTipoPessoa] = useState<"" | "PF" | "PJ">("");
  const [documento, setDocumento] = useState("");
  const [nome, setNome] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [status, setStatus] = useState<"" | "ativo" | "inativo">("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const t = safeString(cliente?.tipoPessoa).toUpperCase();
    setTipoPessoa(t === "PF" || t === "PJ" ? (t as "PF" | "PJ") : "");
    setDocumento(safeString(cliente?.documento));
    setNome(safeString(cliente?.nome ?? cliente?.name));
    setNomeFantasia(safeString(cliente?.nomeFantasia));
    setEmail(safeString(cliente?.email ?? loginData?.email));
    setWhatsapp(
      safeString(cliente?.whatsapp ?? cliente?.telefone ?? cliente?.phone ?? cliente?.celular)
    );
    const s = safeString(cliente?.status).toLowerCase();
    setStatus(s === "ativo" || s === "inativo" ? (s as "ativo" | "inativo") : "");
  }, [cliente, loginData?.email]);

  return (
    <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
      <div className="space-y-2">
        <div>
          <p className="text-[10px] font-montserrat font-semibold uppercase tracking-[0.18em] text-custom-light-600">
            Área do cliente
          </p>
          <div className="mt-1 flex items-center gap-2">
            <User className="h-4 w-4 text-custom-dark-1000" />
            <h1 className="text-xl font-league-spartan font-bold text-custom-dark-1000 sm:text-2xl">
              Meus dados
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-xs font-montserrat text-custom-dark-700 sm:text-sm">
            Atualize seus dados de cadastro. A senha não é alterada por aqui.
          </p>
        </div>
        <div className="text-[11px] font-montserrat text-custom-light-600">
          <span>ID: {safeString(cliente?.id) || "-"}</span>
          <span> • </span>
          <span>Criado em: {safeString(cliente?.createdAt) || "-"}</span>
        </div>
      </div>

      <form
        className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (isSaving) return;

          const patch: Record<string, unknown> = {};

          if (tipoPessoa) patch.tipoPessoa = tipoPessoa;
          if (documento.trim()) patch.documento = documento.trim();
          if (nome.trim()) patch.nome = nome.trim();
          if (tipoPessoa === "PJ" && nomeFantasia.trim()) patch.nomeFantasia = nomeFantasia.trim();
          if (email.trim()) patch.email = email.trim();
          if (whatsapp.trim()) patch.whatsapp = whatsapp.trim();
          if (status) patch.status = status;

          setIsSaving(true);
          try {
            await updateMeusDados(patch);
            await frontModal.success({ title: "Dados atualizados com sucesso." });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao atualizar dados.";
            await frontModal.error({ title: message });
          } finally {
            setIsSaving(false);
          }
        }}
      >
        <div>
          <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
            Tipo de pessoa
          </label>
          <select
            value={tipoPessoa}
            onChange={(e) => setTipoPessoa((e.target.value as "PF" | "PJ" | "") || "")}
            className="mt-1 w-full rounded-md border border-custom-light-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Selecione</option>
            <option value="PF">Pessoa física</option>
            <option value="PJ">Pessoa jurídica</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
            Documento
          </label>
          <input
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
            placeholder="CPF/CNPJ"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
            Nome
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
            placeholder="Seu nome completo"
          />
        </div>

        {tipoPessoa === "PJ" && (
          <div className="md:col-span-2">
            <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
              Nome fantasia
            </label>
            <input
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
              placeholder="Nome fantasia da empresa"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
            WhatsApp
          </label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
            placeholder="(00) 00000-0000"
          />
        </div>

        <div>
          <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
            E-mail
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-custom-light-300 px-3 py-2 text-sm"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label className="block text-xs font-montserrat font-semibold text-custom-light-600">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus((e.target.value as "ativo" | "inativo" | "") || "")}
            className="mt-1 w-full rounded-md border border-custom-light-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Manter</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>

        <div className="md:col-span-2 flex justify-end pt-1">
          <Button disabled={isSaving} type="submit">
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </section>
  );
}
