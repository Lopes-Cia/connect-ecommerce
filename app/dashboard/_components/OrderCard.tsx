"use client";

import { useState } from "react";
import { Copy, MoreVertical, FileText, Ticket, FileCode, ChevronDown } from "lucide-react";

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
      "Entregue": "✓ Entregue",
      "Processando": "⊙ Processando",
      "Pendente": "⚠ Pendente",
      "Cancelado": "✕ Cancelado",
    };
    return labels[status] || status;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <div
      className={`relative bg-white rounded-xl border border-custom-light-300 shadow-sm hover:border-custom-light-400 transition-colors ${
        isMenuOpen ? "z-30 overflow-visible" : "overflow-hidden"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-custom-light-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-custom-dark-1000 font-montserrat font-bold text-sm truncate">
                {orderNumber}
              </h3>
              <button
                onClick={() => navigator.clipboard.writeText(orderNumber)}
                className="shrink-0 text-custom-light-600 hover:text-tints-french-blue transition-colors"
                title="Copiar número do pedido"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-custom-light-600 font-montserrat text-xs">
              {date}
            </p>
          </div>

          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-montserrat font-semibold border ${getStatusColor()}`}>
            {getStatusLabel()}
          </div>
        </div>
      </div>

      {/* Items Preview */}
      <div className="px-4 py-3 bg-custom-light-200/30">
        <p className="text-xs font-montserrat font-medium text-custom-dark-700 mb-2">
          {items.length} {items.length === 1 ? "produto" : "produtos"}
        </p>
        <div className="flex flex-wrap gap-1">
          {items.slice(0, 2).map((item, idx) => (
            <span key={idx} className="inline-block text-xs font-montserrat text-custom-light-700 bg-white px-2 py-1 rounded border border-custom-light-300 truncate max-w-[150px]">
              {item.quantity}x {item.productName.split(" ").slice(0, 2).join(" ")}
            </span>
          ))}
          {items.length > 2 && (
            <span className="inline-block text-xs font-montserrat text-custom-light-700 bg-white px-2 py-1 rounded border border-custom-light-300">
              +{items.length - 2} mais
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-montserrat text-custom-light-600 mb-1">
            Total do pedido
          </p>
          <p className="text-custom-dark-1000 font-league-spartan font-bold text-lg">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="relative z-30 flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-custom-dark-1000 hover:text-tints-french-blue transition-colors p-2 hover:bg-custom-light-200 rounded"
            title="Ver detalhes"
          >
            <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-custom-dark-1000 hover:text-tints-french-blue transition-colors p-2 hover:bg-custom-light-200 rounded"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 top-12 z-50 bg-white border border-custom-light-400 rounded-lg shadow-lg py-1 w-52 text-sm">
                <button className="w-full px-4 py-2.5 text-left font-montserrat text-custom-dark-1000 hover:bg-custom-light-200 flex items-center gap-3 transition-colors">
                  <FileText className="h-4 w-4" />
                  Baixar Nota Fiscal
                </button>
                <button className="w-full px-4 py-2.5 text-left font-montserrat text-custom-dark-1000 hover:bg-custom-light-200 flex items-center gap-3 transition-colors">
                  <Ticket className="h-4 w-4" />
                  Baixar Boleto
                </button>
                <button className="w-full px-4 py-2.5 text-left font-montserrat text-custom-dark-1000 hover:bg-custom-light-200 flex items-center gap-3 transition-colors">
                  <FileCode className="h-4 w-4" />
                  Dados da Entrega
                </button>
                <hr className="my-1 border-custom-light-300" />
                <button className="w-full px-4 py-2.5 text-left font-montserrat text-tints-french-blue hover:bg-blue-50 flex items-center gap-3 transition-colors">
                  <Copy className="h-4 w-4" />
                  Duplicar Pedido
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 py-4 border-t border-custom-light-300 bg-custom-light-100/50">
          <p className="text-xs font-montserrat font-semibold text-custom-dark-700 mb-3">
            Itens do pedido
          </p>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-custom-dark-1000 font-montserrat">
                  {item.productName}
                </span>
                <span className="text-custom-light-600 font-montserrat text-xs">
                  Qtd: {item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
