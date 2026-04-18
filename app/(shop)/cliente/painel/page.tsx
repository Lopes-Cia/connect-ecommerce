"use client";

import Link from "next/link";

import { pickDoisFatores, pickMeusDados, useClientesStore } from "@/stores/clientes-store";

export default function ClientePainelPage() {
  const loginData = useClientesStore((s) => s.loginData);
  const meusDados = pickMeusDados(loginData);
  const doisFatores = pickDoisFatores(loginData);
  const nome = String(meusDados?.nome ?? meusDados?.name ?? loginData?.email ?? "Cliente").trim() || "Cliente";
  const doisFatoresAtivo = Boolean(doisFatores?.habilitado);

  return (
    <div className="space-y-6">
      <h2 className="font-montserrat text-black text-xl font-semibold">Painel</h2>

      <div className="rounded border border-custom-light-400 bg-white p-4">
        <div className="text-sm text-custom-dark-1000 font-semibold">{nome}</div>
        <div className="mt-1 text-xs text-custom-dark-700">
          2FA: {doisFatoresAtivo ? "habilitado" : "desabilitado"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link href="/cliente/meus-dados" className="rounded border border-custom-light-400 p-4 hover:bg-custom-light-100 transition">
          <h3 className="font-semibold text-custom-dark-1000">Meus dados</h3>
          <p className="text-sm text-gray-700 mt-1">Atualize nome, e-mail e telefone.</p>
        </Link>
        <Link href="/cliente/meus-enderecos" className="rounded border border-custom-light-400 p-4 hover:bg-custom-light-100 transition">
          <h3 className="font-semibold text-custom-dark-1000">Meus endereços</h3>
          <p className="text-sm text-gray-700 mt-1">Confira os endereços cadastrados.</p>
        </Link>
        <Link href="/cliente/privacidade" className="rounded border border-custom-light-400 p-4 hover:bg-custom-light-100 transition">
          <h3 className="font-semibold text-custom-dark-1000">Privacidade</h3>
          <p className="text-sm text-gray-700 mt-1">Preferências e consentimentos de dados.</p>
        </Link>
        <Link href="/cliente/meus-pedidos" className="rounded border border-custom-light-400 p-4 hover:bg-custom-light-100 transition">
          <h3 className="font-semibold text-custom-dark-1000">Meus pedidos</h3>
          <p className="text-sm text-gray-700 mt-1">Histórico e status dos seus pedidos.</p>
        </Link>
      </div>

      <div className="rounded border bg-gray-50 p-4">
        <div className="text-sm text-gray-700 font-montserrat mb-2">Sessão do cliente</div>
        <pre className="whitespace-pre-wrap break-words text-xs text-gray-800">
          {JSON.stringify(loginData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
