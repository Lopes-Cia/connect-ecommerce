"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  PackageCheck,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import OrderCard from "../_components/OrderCard";
import { formatCurrency } from "@/lib/formatting";

const mockOrders = [
  {
    orderNumber: "PED-2026-0087",
    date: "10/03/2026",
    status: "Entregue" as const,
    items: [
      { quantity: 50, productName: "Cerveja Premium 600ml" },
      { quantity: 30, productName: "Refrigerante Cola 2L" },
      { quantity: 24, productName: "Água Mineral Sem Gás 1.5L" },
    ],
    total: 2850.50,
  },
  {
    orderNumber: "PED-2026-0086",
    date: "08/03/2026",
    status: "Processando" as const,
    items: [
      { quantity: 40, productName: "Vinho Tinto Reserva Especial 750ml" },
      { quantity: 20, productName: "Suco Natural Laranja 1L" },
    ],
    total: 1420.00,
  },
  {
    orderNumber: "PED-2026-0085",
    date: "05/03/2026",
    status: "Entregue" as const,
    items: [
      { quantity: 100, productName: "Cerveja Artesanal 350ml" },
      { quantity: 50, productName: "Energético Premium 250ml" },
      { quantity: 30, productName: "Chá Gelado Frutas Vermelhas 500ml" },
    ],
    total: 3290.00,
  },
  {
    orderNumber: "PED-2026-0084",
    date: "01/03/2026",
    status: "Entregue" as const,
    items: [
      { quantity: 60, productName: "Vinho Branco Seco 750ml" },
      { quantity: 40, productName: "Refrigerante Laranja 2L" },
    ],
    total: 2140.00,
  },
  {
    orderNumber: "PED-2026-0083",
    date: "28/02/2026",
    status: "Pendente" as const,
    items: [
      { quantity: 80, productName: "Vodka Premium 1L" },
      { quantity: 25, productName: "Suco Natural Uva 1L" },
      { quantity: 35, productName: "Água Tônica Premium 500ml" },
    ],
    total: 3950.00,
  },
  {
    orderNumber: "PED-2026-0082",
    date: "25/02/2026",
    status: "Cancelado" as const,
    items: [
      { quantity: 100, productName: "Cerveja Lager 350ml" },
      { quantity: 50, productName: "Chopp Natural 5L" },
    ],
    total: 1890.00,
  },
];

type OrderStatus = "Entregue" | "Pendente" | "Processando" | "Cancelado";

const statusOptions: Array<"Todos" | OrderStatus> = [
  "Todos",
  "Entregue",
  "Processando",
  "Pendente",
  "Cancelado",
];

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | OrderStatus>("Todos");

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredOrders = mockOrders.filter((order) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      order.orderNumber.toLowerCase().includes(normalizedQuery) ||
      order.items.some((item) =>
        item.productName.toLowerCase().includes(normalizedQuery)
      );

    const matchesStatus =
      statusFilter === "Todos" || order.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  const totalValue = filteredOrders.reduce((acc, order) => acc + order.total, 0);
  const deliveredCount = filteredOrders.filter((order) => order.status === "Entregue").length;
  const processingCount = filteredOrders.filter((order) => order.status === "Processando").length;
  const pendingCount = filteredOrders.filter((order) => order.status === "Pendente").length;



  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f7f9_0%,#ffffff_34%,#ffffff_100%)] p-3 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-montserrat font-semibold uppercase tracking-[0.18em] text-custom-light-600">
                Operação Comercial
              </p>
              <div className="mt-1 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-custom-dark-1000" />
                <h1 className="text-xl font-league-spartan font-bold text-custom-dark-1000 sm:text-2xl">
                  Gestão de Pedidos
                </h1>
              </div>
              <p className="mt-2 max-w-2xl text-xs font-montserrat text-custom-dark-700 sm:text-sm">
                Consulte pedidos, acompanhe gargalos de processamento e priorize a execução por status.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-[320px] sm:gap-3">
              <div className="rounded-lg border border-custom-light-300 bg-custom-light-200/40 px-3 py-2">
                <p className="text-[10px] font-montserrat uppercase tracking-wider text-custom-light-600">
                  Pedidos filtrados
                </p>
                <p className="mt-1 text-sm font-league-spartan font-bold text-custom-dark-1000 sm:text-base">
                  {filteredOrders.length}
                </p>
              </div>
              <div className="rounded-lg border border-custom-light-300 bg-custom-light-200/40 px-3 py-2">
                <p className="text-[10px] font-montserrat uppercase tracking-wider text-custom-light-600">
                  Ultima sincronização
                </p>
                <p className="mt-1 text-sm font-league-spartan font-bold text-custom-dark-1000 sm:text-base">
                  31/03 09:42
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="w-full max-w-xl">
              <label
                htmlFor="orders-search"
                className="mb-1.5 block text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600"
              >
                Buscar por código ou produto
              </label>
              <div className="relative">
                <input
                  id="orders-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex.: PED-2026-0087 ou Cerveja"
                  className="h-10 w-full rounded-md border border-custom-light-300 bg-white pl-3 pr-9 text-xs font-montserrat text-custom-dark-1000 outline-none transition-shadow placeholder:text-custom-light-600 focus:ring-2 focus:ring-custom-light-400"
                />
                <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-custom-light-600" />
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-[1fr_auto] md:w-auto">
              <div className="min-w-45">
                <label
                  htmlFor="orders-status"
                  className="mb-1.5 block text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600"
                >
                  Filtro de status
                </label>
                <div className="relative">
                  <select
                    id="orders-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "Todos" | OrderStatus)}
                    className="h-10 w-full appearance-none rounded-md border border-custom-light-300 bg-white px-3 text-xs font-montserrat text-custom-dark-1000 outline-none transition-shadow focus:ring-2 focus:ring-custom-light-400"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-custom-light-600" />
                </div>
              </div>

              <div className="flex items-end">
                <p className="rounded-md border border-custom-light-300 bg-custom-light-200/30 px-3 py-2 text-[11px] font-montserrat text-custom-light-600">
                  {filteredOrders.length} resultados
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-custom-light-300 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
                Valor em carteira
              </p>
              <CircleDollarSign className="h-3.5 w-3.5 text-green-600" />
            </div>
            <p className="text-lg leading-none font-league-spartan font-bold text-custom-dark-1000">
              {formatCurrency(totalValue)}
            </p>
          </div>

          <div className="rounded-xl border border-custom-light-300 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
                Entregues
              </p>
              <PackageCheck className="h-3.5 w-3.5 text-green-600" />
            </div>
            <p className="text-lg leading-none font-league-spartan font-bold text-custom-dark-1000">
              {deliveredCount}
            </p>
          </div>

          <div className="rounded-xl border border-custom-light-300 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
                Em processamento
              </p>
              <Clock3 className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <p className="text-lg leading-none font-league-spartan font-bold text-custom-dark-1000">
              {processingCount}
            </p>
          </div>

          <div className="rounded-xl border border-custom-light-300 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
                Pendentes
              </p>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <p className="text-lg leading-none font-league-spartan font-bold text-custom-dark-1000">
              {pendingCount}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-league-spartan font-bold text-custom-dark-1000 sm:text-xl">
                Lista Operacional
              </h2>
              <p className="mt-1 text-xs font-montserrat text-custom-light-600">
                Cards compactos com status, itens e ações de cada pedido.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.orderNumber}
                orderNumber={order.orderNumber}
                date={order.date}
                status={order.status}
                items={order.items}
                total={order.total}
              />
            ))}
          </div>
        </section>

        {filteredOrders.length === 0 && (
          <section className="rounded-2xl border border-dashed border-custom-light-400 bg-white p-8 text-center shadow-sm">
            <ClipboardList className="mx-auto mb-3 h-8 w-8 text-custom-light-400" />
            <p className="text-sm font-montserrat text-custom-dark-1000">
              Nenhum pedido encontrado para &quot;{searchQuery}&quot;
            </p>
            <p className="mt-1 text-xs font-montserrat text-custom-light-600">
              Ajuste os filtros para ampliar o escopo da consulta.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
