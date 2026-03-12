"use client";

import { useState } from "react";
import {
  CalendarClock,
  PlusCircle,
  Pencil,
  Pause,
  Trash2,
  Play,
} from "lucide-react";

interface Automation {
  id: string;
  name: string;
  schedule: string;
  status: "Ativo" | "Pausado";
}

const mockAutomations: Automation[] = [
  {
    id: "1",
    name: "Pedido Semanal - Bebidas Variadas",
    schedule: "Todas as segundas-feiras",
    status: "Ativo",
  },
  {
    id: "2",
    name: "Reposição Mensal - Bebidas Alcoólicas",
    schedule: "Dia 1 de cada mês",
    status: "Ativo",
  },
  {
    id: "3",
    name: "Entrega Automática - Cervejas Premium",
    schedule: "Quinzenalmente (Dias 1 e 15)",
    status: "Pausado",
  },
  {
    id: "4",
    name: "Pedido Programado - Refrigerantes Diversos",
    schedule: "Toda quarta-feira",
    status: "Ativo",
  },
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations);

  const handleToggleStatus = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: a.status === "Ativo" ? "Pausado" : "Ativo" }
          : a
      )
    );
  };

  const handleDelete = (id: string) => {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-custom-light-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-1">
            <CalendarClock className="w-6 h-6 text-custom-dark-1000" />
            <h1 className="text-2xl font-montserrat font-bold text-custom-dark-1000">
              Automações
            </h1>
          </div>
          <p className="text-custom-light-600 font-montserrat text-sm">
            Configure pedidos automáticos recorrentes para facilitar suas operações.
          </p>
        </div>

        {/* Divider */}
        <hr className="border-custom-light-400 mb-8" />

        {/* Add Button */}
        <button className="flex items-center gap-2 bg-custom-dark-1000 text-white font-montserrat font-semibold text-sm px-5 py-2.5 rounded-md hover:opacity-90 transition-opacity mb-6">
          <PlusCircle className="w-4 h-4" />
          Adicionar Automação
        </button>

        {/* Automations List */}
        <div className="space-y-4 max-w-md">
          {automations.map((automation) => (
            <div
              key={automation.id}
              className="bg-white rounded-lg border border-custom-light-300 p-4 shadow-sm flex items-center justify-between"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-custom-dark-1000 font-montserrat font-bold text-sm">
                    {automation.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-montserrat font-semibold ${
                      automation.status === "Ativo"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {automation.status}
                  </span>
                </div>
                <p className="text-custom-light-600 font-montserrat text-xs">
                  {automation.schedule}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  className="text-custom-dark-1000 hover:text-tints-ruby-red-100 transition-colors p-1"
                  title="Editar"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleToggleStatus(automation.id)}
                  className="text-custom-dark-1000 hover:text-tints-ruby-red-100 transition-colors p-1"
                  title={automation.status === "Ativo" ? "Pausar" : "Retomar"}
                >
                  {automation.status === "Ativo" ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(automation.id)}
                  className="text-red-500 hover:text-red-700 transition-colors p-1"
                  title="Excluir"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {automations.length === 0 && (
            <div className="text-center py-16">
              <CalendarClock className="w-12 h-12 text-custom-light-400 mx-auto mb-4" />
              <p className="text-custom-light-600 font-montserrat text-sm">
                Nenhuma automação configurada
              </p>
              <p className="text-custom-light-600 font-montserrat text-xs mt-1">
                Clique em &quot;Adicionar Automação&quot; para começar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
