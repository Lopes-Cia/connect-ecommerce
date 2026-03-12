"use client";

import { useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import OrderCard from "../_components/OrderCard";

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

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = mockOrders.filter((order) =>
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-custom-light-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="w-6 h-6 text-custom-dark-1000" />
            <h1 className="text-2xl font-montserrat font-bold text-custom-dark-1000">
              Meus Pedidos
            </h1>
          </div>
          <p className="text-custom-light-600 font-montserrat text-sm">
            Navegue pelos pedidos ou faça uma busca específica
          </p>
        </div>

        {/* Divider */}
        <hr className="border-custom-light-400 mb-6" />

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative w-full max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Busque pelo código único"
              className="w-full pl-4 pr-10 py-2.5 border border-custom-light-400 rounded-md font-montserrat text-sm focus:outline-none focus:ring-2 focus:ring-tints-ruby-red-100 transition-all bg-white"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="w-4 h-4 text-custom-light-600" />
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-custom-light-400 mx-auto mb-4" />
            <p className="text-custom-light-600 font-montserrat text-sm">
              Nenhum pedido encontrado para &quot;{searchQuery}&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
