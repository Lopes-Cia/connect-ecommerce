import DashboardCard from "./_components/DashboardCard";
import OrderCard from "./_components/OrderCard";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { getSession } from "@/lib/auth/session";

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
    total: 2850.5,
  },
  {
    orderNumber: "PED-2026-0086",
    date: "08/03/2026",
    status: "Processando" as const,
    items: [
      { quantity: 40, productName: "Vinho Tinto Reserva Especial 750ml" },
      { quantity: 20, productName: "Suco Natural Laranja 1L" },
    ],
    total: 1420,
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
    total: 3290,
  },
];

export default async function DashboardPage() {
  const session = await getSession();
  const displayName = session?.name?.trim() || session?.email || "Cliente";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f7f8_0%,#ffffff_28%,#ffffff_100%)] p-3 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-montserrat font-semibold uppercase tracking-widest text-custom-light-600">
                Painel Comercial
              </p>
              <h1 className="mt-1 text-2xl font-league-spartan font-bold text-custom-dark-1000 sm:text-3xl">
                Bem-vindo, {displayName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-montserrat text-custom-dark-700">
                Monitore desempenho de pedidos, faturamento e pendencias da sua operacao em um unico painel.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-lg border border-custom-light-300 bg-custom-light-200/40 px-3 py-2">
                <p className="text-[10px] font-montserrat uppercase tracking-wider text-custom-light-600">
                  SLA de Entrega
                </p>
                <p className="mt-1 text-base font-league-spartan font-bold text-custom-dark-1000">96,4%</p>
              </div>
              <div className="rounded-lg border border-custom-light-300 bg-custom-light-200/40 px-3 py-2">
                <p className="text-[10px] font-montserrat uppercase tracking-wider text-custom-light-600">
                  Ticket Medio
                </p>
                <p className="mt-1 text-base font-league-spartan font-bold text-custom-dark-1000">R$ 1.553</p>
              </div>
              <div className="rounded-lg border border-custom-light-300 bg-custom-light-200/40 px-3 py-2">
                <p className="text-[10px] font-montserrat uppercase tracking-wider text-custom-light-600">
                  Ultima Atualização
                </p>
                <p className="mt-1 text-base font-league-spartan font-bold text-custom-dark-1000">31/03 09:42</p>
              </div>
              <div className="rounded-lg border border-custom-light-300 bg-custom-light-200/40 px-3 py-2">
                <p className="text-[10px] font-montserrat uppercase tracking-wider text-custom-light-600">
                  Limite Disponível
                </p>
                <p className="mt-1 text-base font-league-spartan font-bold text-custom-dark-1000">R$ 18.200</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            icon={ShoppingCart}
            title="Pedidos Este Mês"
            value="24"
            change="+12% vs mês anterior"
            changeType="positive"
            bgColor="bg-blue-50"
            accentColor="text-blue-600"
          />
          <DashboardCard
            icon={TrendingUp}
            title="Total Gasto"
            value="R$ 37.290"
            change="+8% vs mês anterior"
            changeType="positive"
            bgColor="bg-green-50"
            accentColor="text-green-600"
          />
          <DashboardCard
            icon={Package}
            title="Produtos Entregues"
            value="1.240"
            change="+15% vs período anterior"
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-league-spartan font-bold text-custom-dark-1000 sm:text-xl">
                  Últimos Pedidos
                </h2>
                <p className="mt-1 text-xs font-montserrat text-custom-light-600 sm:text-sm">
                  Acompanhe o ciclo operacional dos pedidos mais recentes
                </p>
              </div>
              <button className="inline-flex shrink-0 items-center gap-1 rounded-md border border-custom-light-300 px-3 py-1.5 text-xs font-montserrat font-semibold text-custom-dark-1000 transition-colors hover:bg-custom-light-200">
                Ver todos
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
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
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="text-base font-league-spartan font-bold text-custom-dark-1000">
                Saude da Operacao
              </h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-start justify-between gap-3 rounded-lg border border-custom-light-300 p-3">
                  <div className="inline-flex items-center gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs font-montserrat font-semibold text-custom-dark-1000">Pedidos sem atraso</p>
                      <p className="text-[11px] font-montserrat text-custom-light-600">18 de 21 em 24h</p>
                    </div>
                  </div>
                  <span className="text-xs font-montserrat font-semibold text-green-700">86%</span>
                </div>

                <div className="flex items-start justify-between gap-3 rounded-lg border border-custom-light-300 p-3">
                  <div className="inline-flex items-center gap-2">
                    <Clock3 className="mt-0.5 h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-xs font-montserrat font-semibold text-custom-dark-1000">Risco de atraso</p>
                      <p className="text-[11px] font-montserrat text-custom-light-600">2 pedidos para hoje</p>
                    </div>
                  </div>
                  <span className="text-xs font-montserrat font-semibold text-amber-700">Moderado</span>
                </div>

                <div className="flex items-start justify-between gap-3 rounded-lg border border-custom-light-300 p-3">
                  <div className="inline-flex items-center gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-xs font-montserrat font-semibold text-custom-dark-1000">Pendências financeiras</p>
                      <p className="text-[11px] font-montserrat text-custom-light-600">1 boleto vence em 48h</p>
                    </div>
                  </div>
                  <span className="text-xs font-montserrat font-semibold text-red-700">Atenção</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-custom-light-300 bg-custom-dark-1000 p-4 text-white shadow-sm sm:p-5">
              <p className="text-[11px] font-montserrat uppercase tracking-wider text-white/70">
                Ação recomendada
              </p>
              <h3 className="mt-2 text-lg font-league-spartan font-bold">
                Repor estoque de itens de giro rápido
              </h3>
              <p className="mt-2 text-xs font-montserrat text-white/80">
                3 SKUs atingiram nivel mínimo no centro de distribuição. Reabastecer hoje evita ruptura em 72h.
              </p>
              <button className="mt-4 inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-montserrat font-semibold text-custom-dark-1000 transition-opacity hover:opacity-90">
                Criar pedido de reposição
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

