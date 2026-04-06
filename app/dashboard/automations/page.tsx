"use client";

import { useState } from "react";
import {
  Bot,
  CalendarClock,
  Clock3,
  PlusCircle,
  Pencil,
  Pause,
  Search,
  ShieldCheck,
  SlidersHorizontal,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | Automation["status"]>("Todos");

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

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredAutomations = automations.filter((automation) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      automation.name.toLowerCase().includes(normalizedQuery) ||
      automation.schedule.toLowerCase().includes(normalizedQuery);

    const matchesStatus =
      statusFilter === "Todos" || automation.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  const activeCount = automations.filter((automation) => automation.status === "Ativo").length;
  const pausedCount = automations.filter((automation) => automation.status === "Pausado").length;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f7f9_0%,#ffffff_34%,#ffffff_100%)] p-3 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-montserrat font-semibold uppercase tracking-[0.18em] text-custom-light-600">
                Planejamento Recorrente
              </p>
              <div className="mt-1 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-custom-dark-1000" />
                <h1 className="text-xl font-league-spartan font-bold text-custom-dark-1000 sm:text-2xl">
                  Centro de Automações
                </h1>
              </div>
              <p className="mt-2 max-w-2xl text-xs font-montserrat text-custom-dark-700 sm:text-sm">
                Controle jobs recorrentes de pedido com visão de status, agenda e cobertura operacional.
              </p>
            </div>

            <button className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-custom-dark-1000 px-3 text-xs font-montserrat font-semibold text-white transition-opacity hover:opacity-90">
              <PlusCircle className="h-3.5 w-3.5" />
              Nova automação
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-custom-light-300 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
                Total de jobs
              </p>
              <Bot className="h-3.5 w-3.5 text-custom-dark-1000" />
            </div>
            <p className="text-lg leading-none font-league-spartan font-bold text-custom-dark-1000">
              {automations.length}
            </p>
          </div>

          <div className="rounded-xl border border-custom-light-300 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
                Jobs ativos
              </p>
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
            </div>
            <p className="text-lg leading-none font-league-spartan font-bold text-custom-dark-1000">
              {activeCount}
            </p>
          </div>

          <div className="rounded-xl border border-custom-light-300 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
                Jobs pausados
              </p>
              <Pause className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <p className="text-lg leading-none font-league-spartan font-bold text-custom-dark-1000">
              {pausedCount}
            </p>
          </div>

          <div className="rounded-xl border border-custom-light-300 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
                Janela de execução
              </p>
              <Clock3 className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <p className="text-lg leading-none font-league-spartan font-bold text-custom-dark-1000">
              06:00-22:00
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="w-full max-w-xl">
              <label
                htmlFor="automation-search"
                className="mb-1.5 block text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600"
              >
                Buscar automação
              </label>
              <div className="relative">
                <input
                  id="automation-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex.: Reposição mensal"
                  className="h-10 w-full rounded-md border border-custom-light-300 bg-white pl-3 pr-9 text-xs font-montserrat text-custom-dark-1000 outline-none transition-shadow placeholder:text-custom-light-600 focus:ring-2 focus:ring-custom-light-400"
                />
                <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-custom-light-600" />
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-[1fr_auto] md:w-auto">
              <div className="min-w-45">
                <label
                  htmlFor="automation-status"
                  className="mb-1.5 block text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600"
                >
                  Status
                </label>
                <div className="relative">
                  <select
                    id="automation-status"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as "Todos" | Automation["status"])
                    }
                    className="h-10 w-full appearance-none rounded-md border border-custom-light-300 bg-white px-3 text-xs font-montserrat text-custom-dark-1000 outline-none transition-shadow focus:ring-2 focus:ring-custom-light-400"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Pausado">Pausado</option>
                  </select>
                  <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-custom-light-600" />
                </div>
              </div>

              <div className="flex items-end">
                <p className="rounded-md border border-custom-light-300 bg-custom-light-200/30 px-3 py-2 text-[11px] font-montserrat text-custom-light-600">
                  {filteredAutomations.length} resultados
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-league-spartan font-bold text-custom-dark-1000 sm:text-xl">
              Jobs configurados
            </h2>
            <p className="mt-1 text-xs font-montserrat text-custom-light-600">
              Lista operacional com controles de edição, pausa e exclusão.
            </p>
          </div>

          <div className="space-y-3">
            {filteredAutomations.map((automation) => (
              <article
                key={automation.id}
                className="rounded-xl border border-custom-light-300 bg-white p-3 shadow-sm transition-colors hover:border-custom-light-400"
              >
                <div className="flex flex-col gap-3 md:grid md:grid-cols-[2fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-montserrat font-semibold text-custom-dark-1000">
                        {automation.name}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-montserrat font-semibold ${
                          automation.status === "Ativo"
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-amber-300 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {automation.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-montserrat text-custom-light-600">
                      {automation.schedule}
                    </p>
                  </div>

                  <div className="rounded-md border border-custom-light-300 bg-custom-light-200/30 px-2.5 py-2 text-[11px] font-montserrat text-custom-dark-1000">
                    Próxima execução: 01/04 08:00
                  </div>

                  <div className="flex items-center gap-1 justify-self-start md:justify-self-end">
                    <button
                      className="rounded-md p-1.5 text-custom-dark-1000 transition-colors hover:bg-custom-light-200 hover:text-tints-french-blue"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(automation.id)}
                      className="rounded-md p-1.5 text-custom-dark-1000 transition-colors hover:bg-custom-light-200 hover:text-tints-french-blue"
                      title={automation.status === "Ativo" ? "Pausar" : "Retomar"}
                    >
                      {automation.status === "Ativo" ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(automation.id)}
                      className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filteredAutomations.length === 0 && (
            <div
              className="mt-3 rounded-xl border border-dashed border-custom-light-400 bg-custom-light-200/10 p-8 text-center"
            >
              <CalendarClock className="mx-auto mb-3 h-8 w-8 text-custom-light-400" />
              <p className="text-sm font-montserrat text-custom-dark-1000">
                Nenhuma automação encontrada para os filtros atuais
              </p>
              <p className="mt-1 text-xs font-montserrat text-custom-light-600">
                Revise termo buscado ou status selecionado.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
