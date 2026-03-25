import DashboardCard from "./_components/DashboardCard";
import OrderCard from "./_components/OrderCard";
import { ShoppingCart, TrendingUp, Package, AlertCircle } from "lucide-react";
import { requireAuth } from "@/lib/auth/protected";

// Mock order data for beverage distributor
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
];

export default async function DashboardPage() {
  const session = await requireAuth();
  const displayName = session.name?.trim() || session.email || "Cliente";

  return (
    <div className="min-h-screen bg-linear-to-br from-custom-light-100 to-custom-light-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-league-spartan font-bold text-custom-dark-1000 mb-2">
            Bem-vindo, {displayName}
          </h1>
          <p className="text-custom-dark-700 font-montserrat text-base">
            Acompanhe suas compas, pedidos e gerenciar sua conta de distribuidor
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <DashboardCard
            icon={ShoppingCart}
            title="Pedidos Este Mês"
            value="24"
            change="+ 12% vs. mês anterior"
            changeType="positive"
            bgColor="bg-blue-50"
            accentColor="text-blue-600"
          />
          <DashboardCard
            icon={TrendingUp}
            title="Total Gasto"
            value="R$ 37.290"
            change="+ 8% vs. mês anterior"
            changeType="positive"
            bgColor="bg-green-50"
            accentColor="text-green-600"
          />
          <DashboardCard
            icon={Package}
            title="Produtos Entregues"
            value="1.240"
            change="+ 15% vs. período anterior"
            changeType="positive"
            bgColor="bg-amber-50"
            accentColor="text-amber-600"
          />
          <DashboardCard
            icon={AlertCircle}
            title="Pedidos Pendentes"
            value="3"
            change="Revisão necessária"
            changeType="negative"
            bgColor="bg-red-50"
            accentColor="text-red-600"
          />
        </div>

        {/* Recent Orders */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-league-spartan font-bold text-custom-dark-1000 mb-2">
              Últimos Pedidos
            </h2>
            <p className="text-custom-dark-700 font-montserrat text-sm">
              Acompanhe o status dos seus pedidos mais recentes
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {mockOrders.map((order) => (
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
        </div>
      </div>
    </div>
  );
}

