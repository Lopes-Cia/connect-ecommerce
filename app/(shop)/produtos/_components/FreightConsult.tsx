"use client";

import { useState } from "react";

import { frontModal } from "@/stores/front-modal-store";

function normalizeCep(value: string): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 8);
}

function formatCep(value: string): string {
  const digits = normalizeCep(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function FreightConsult() {
  const [cep, setCep] = useState("");

  const handleConsultCep = () => {
    const normalized = normalizeCep(cep);
    if (normalized.length !== 8) {
      void frontModal.warning({
        title: "CEP inválido",
        description: "Digite um CEP com 8 números.",
      });
      return;
    }

    void frontModal.warning({
      title: "Em breve",
      description: "A consulta de frete por CEP será disponibilizada em breve.",
    });
  };

  return (
    <div className="pb-4 border-b border-custom-light-400 mb-4">
      <p className="text-custom-dark-1000 font-montserrat font-semibold text-xs uppercase mb-3">Consulte Frete</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={cep}
          onChange={(e) => setCep(formatCep(e.target.value))}
          placeholder="Inserir CEP*"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={9}
          className="flex-1 px-3 py-2 border border-custom-light-400 rounded bg-white text-custom-dark-1000 font-montserrat text-xs placeholder:text-custom-light-500 focus:outline-none focus:ring-1 focus:ring-tints-french-blue"
        />
        <button
          type="button"
          onClick={handleConsultCep}
          className="px-3 py-2 border border-custom-light-400 rounded bg-white hover:bg-custom-light-200 transition-colors"
        >
          OK
        </button>
      </div>
      <button
        type="button"
        onClick={() =>
          void frontModal.warning({
            title: "Em breve",
            description: "A recuperação de CEP será disponibilizada em breve.",
          })
        }
        className="text-left text-tints-french-blue font-montserrat text-[10px] underline hover:opacity-80 mt-2 block"
      >
        Não lembra meu CEP
      </button>
    </div>
  );
}
