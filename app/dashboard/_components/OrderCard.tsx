"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Copy,
  FileCode,
  FileText,
  MoreVertical,
  Package2,
  Ticket,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatting";

interface OrderItem {
  quantity: number;
  productName: string;
}

interface OrderCardProps {
  orderNumber: string;
  date: string;
  status: "Entregue" | "Pendente" | "Processando" | "Cancelado";
  items: OrderItem[];
  total: number;
}

export default function OrderCard({
  orderNumber,
  date,
  status,
  items,
  total,
}: OrderCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = () => {
    switch (status) {
      case "Entregue":
        return "bg-green-100 text-green-700 border-green-300";
      case "Processando":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "Pendente":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "Cancelado":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusLabel = () => {
    const labels = {
      Entregue: "Concluido",
      Processando: "Em processamento",
      Pendente: "Pendente",
      Cancelado: "Cancelado",
    };
    return labels[status] || status;
  };



  return (
    <div
      className={`relative rounded-xl border border-custom-light-300 bg-white shadow-sm transition-all hover:border-custom-light-400 hover:shadow-md ${
        isMenuOpen ? "z-30 overflow-visible" : "overflow-hidden"
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-montserrat font-bold text-custom-dark-1000">
                {orderNumber}
              </h3>
              <button
                onClick={() => navigator.clipboard.writeText(orderNumber)}
                className="shrink-0 rounded p-1 text-custom-light-600 transition-colors hover:bg-custom-light-200 hover:text-tints-french-blue"
                title="Copiar número do pedido"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-montserrat text-custom-light-600">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {date}
              </span>
              <span className="inline-flex items-center gap-1">
                <Package2 className="h-3 w-3" />
                {items.length} {items.length === 1 ? "item" : "itens"}
              </span>
            </div>
          </div>

          <div
            className={`inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-[11px] font-montserrat font-semibold ${getStatusColor()}`}
          >
            {getStatusLabel()}
          </div>
        </div>
      </div>

      <div className="border-y border-custom-light-300 bg-custom-light-200/25 px-4 py-3 sm:px-5">
        <div className="divide-y divide-custom-light-300/70">
          {(isExpanded ? items : items.slice(0, 3)).map((item, idx) => (
            <div key={idx} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <p className="line-clamp-1 text-xs font-montserrat text-custom-dark-1000 sm:text-[13px]">
                {item.productName}
              </p>
              <span className="shrink-0 rounded bg-white px-2 py-0.5 text-[11px] font-montserrat font-semibold text-custom-light-700">
                {item.quantity}x
              </span>
            </div>
          ))}
        </div>

        {!isExpanded && items.length > 3 && (
          <p className="mt-2 text-[11px] font-montserrat text-custom-light-600">
            +{items.length - 3} itens nao exibidos
          </p>
        )}
      </div>

      <div className="flex items-end justify-between gap-3 p-4 sm:p-5">
        <div>
          <p className="mb-1 text-[11px] font-montserrat uppercase tracking-wider text-custom-light-600">
            Valor total
          </p>
          <p className="text-xl font-league-spartan font-bold text-custom-dark-1000">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="relative z-30 flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 rounded-md border border-custom-light-300 px-2.5 py-1.5 text-xs font-montserrat font-medium text-custom-dark-1000 transition-colors hover:bg-custom-light-200"
            title={isExpanded ? "Ocultar itens" : "Ver todos itens"}
          >
            Itens
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-md p-2 text-custom-dark-1000 transition-colors hover:bg-custom-light-200 hover:text-tints-french-blue"
            title="Mais ações"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-48 rounded-lg border border-custom-light-400 bg-white py-1 text-xs shadow-lg">
                <button className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left font-montserrat text-custom-dark-1000 transition-colors hover:bg-custom-light-200">
                  <FileText className="h-3.5 w-3.5" />
                  Baixar Nota Fiscal
                </button>
                <button className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left font-montserrat text-custom-dark-1000 transition-colors hover:bg-custom-light-200">
                  <Ticket className="h-3.5 w-3.5" />
                  Baixar Boleto
                </button>
                <button className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left font-montserrat text-custom-dark-1000 transition-colors hover:bg-custom-light-200">
                  <FileCode className="h-3.5 w-3.5" />
                  Dados da Entrega
                </button>
                <hr className="my-1 border-custom-light-300" />
                <button className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left font-montserrat text-tints-french-blue transition-colors hover:bg-blue-50">
                  <Copy className="h-3.5 w-3.5" />
                  Duplicar Pedido
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
