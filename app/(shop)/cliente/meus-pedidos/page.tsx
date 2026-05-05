"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";

import OrdersFilters from "./_components/OrdersFilters";
import OrdersTable from "./_components/OrdersTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatting";
import { useControlStore } from "@/stores/control-store";
import { frontModal } from "@/stores/front-modal-store";
import type { PedidoResumoUI } from "@/stores/pedidos-store";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseClienteId(loginData: unknown): number | null {
  const root = asRecord(loginData);
  const meus = asRecord(root?.meus_dados);
  const id = Number.parseInt(String(meus?.id ?? "").trim(), 10);
  return Number.isFinite(id) ? id : null;
}

function normalizeStatus(value: string): string {
  const raw = String(value ?? "").trim();
  return raw || "desconhecido";
}

function matchesPedidoSearch(pedido: PedidoResumoUI, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (String(pedido.pedidoId).includes(q.replace("#", ""))) return true;
  const itens = Array.isArray(pedido.raw?.itens) ? (pedido.raw.itens as unknown[]) : [];
  for (const rawItem of itens) {
    const item = asRecord(rawItem);
    const nome = String(item?.nome ?? "").toLowerCase();
    if (nome && nome.includes(q)) return true;
  }
  return false;
}

function byCreatedAtDesc(a: PedidoResumoUI, b: PedidoResumoUI): number {
  const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
  const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
  return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
}

export default function MeusPedidosPage() {
  const router = useRouter();
  const openedLoginModalRef = useRef(false);

  const useClientesStore = useControlStore((s) => s.CLIENTESSTORE);
  const usePedidosStore = useControlStore((s) => s.PEDIDOSSTORE);

  const isLoggedIn = useClientesStore((s) => s.isLoggedIn);
  const loginData = useClientesStore((s) => s.loginData);

  const pedidosStatus = usePedidosStore((s) => s.pedidosStatus);
  const pedidosError = usePedidosStore((s) => s.pedidosError);
  const pedidos = usePedidosStore((s) => s.pedidos);
  const pedidosPage = usePedidosStore((s) => s.pedidosPage);
  const pedidosPageSize = usePedidosStore((s) => s.pedidosPageSize);
  const pedidosTotal = usePedidosStore((s) => s.pedidosTotal);
  const pedidosTotalPages = usePedidosStore((s) => s.pedidosTotalPages);
  const loadPedidosByCliente = usePedidosStore((s) => s.loadPedidosByCliente);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const clienteId = useMemo(() => parseClienteId(loginData), [loginData]);

  useEffect(() => {
    if (isLoggedIn) return;
    if (openedLoginModalRef.current) return;
    openedLoginModalRef.current = true;

    void (async () => {
      const confirmed = await frontModal.confirm({
        title: "Login necessário",
        description: "Faça login para visualizar seus pedidos.",
        confirmText: "Ir para login",
        cancelText: "Cancelar",
      });

      if (!confirmed) return;
      if (useClientesStore.getState().isLoggedIn) return;
      router.replace("/login");
    })();
  }, [isLoggedIn, router, useClientesStore]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!clienteId) return;
    void loadPedidosByCliente({ clienteId, page: pedidosPage, pageSize: pedidosPageSize });
  }, [clienteId, isLoggedIn, loadPedidosByCliente, pedidosPage, pedidosPageSize]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of pedidos) set.add(normalizeStatus(p.status));
    return ["Todos", ...Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))];
  }, [pedidos]);

  const filtered = useMemo(() => {
    const list = pedidos
      .filter((p) => matchesPedidoSearch(p, query))
      .filter((p) => statusFilter === "Todos" || normalizeStatus(p.status) === normalizeStatus(statusFilter))
      .slice()
      .sort(byCreatedAtDesc);
    return list;
  }, [pedidos, query, statusFilter]);

  const totalGastoPagina = useMemo(() => {
    return filtered.reduce((acc, p) => acc + (Number.isFinite(p.total) ? p.total : 0), 0);
  }, [filtered]);

  async function copyPedidoId(pedidoId: number) {
    try {
      await navigator.clipboard.writeText(String(pedidoId));
      void frontModal.success({
        title: "Copiado",
        description: `Pedido #${pedidoId} copiado.`,
      });
    } catch {
      void frontModal.error({
        title: "Não foi possível copiar",
        description: "Seu navegador bloqueou a cópia para a área de transferência.",
      });
    }
  }

  function viewDetails(pedidoId: number) {
    router.push(`/cliente/meus-pedidos/${pedidoId}`);
  }

  function refresh() {
    if (!clienteId) return;
    void loadPedidosByCliente({ clienteId, page: pedidosPage, pageSize: pedidosPageSize });
  }

  if (!isLoggedIn) return null;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
        <div className="space-y-2">
            <div>
              <p className="text-[10px] font-montserrat font-semibold uppercase tracking-[0.18em] text-custom-light-600">
                Área do cliente
              </p>
              <div className="mt-1 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-custom-dark-1000" />
                <h1 className="text-xl font-league-spartan font-bold text-custom-dark-1000 sm:text-2xl">
                  Meus pedidos
                </h1>
              </div>
              <p className="mt-2 max-w-2xl text-xs font-montserrat text-custom-dark-700 sm:text-sm">
                Consulte seus pedidos, acompanhe status e visualize detalhes de entrega e pagamento.
              </p>
            </div>
          </div>
        </section>

        <OrdersFilters
          query={query}
          onQueryChange={setQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusOptions={statusOptions}
          resultsCount={filtered.length}
          isLoading={pedidosStatus === "loading"}
          onRefresh={refresh}
        />

        {pedidosStatus === "error" && (
          <Alert variant="destructive">
            <AlertTitle>Falha ao carregar pedidos</AlertTitle>
            <AlertDescription>{pedidosError || "Erro inesperado"}</AlertDescription>
          </Alert>
        )}

        {pedidosStatus === "loading" && pedidos.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-44" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            </div>
            <div className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        )}

        {pedidosStatus !== "loading" && filtered.length === 0 && (
          <section className="rounded-2xl border border-dashed border-custom-light-400 bg-white p-8 text-center shadow-sm">
            <ClipboardList className="mx-auto mb-3 h-8 w-8 text-custom-light-400" />
            <p className="text-sm font-montserrat text-custom-dark-1000">Nenhum pedido encontrado.</p>
            <p className="mt-1 text-xs font-montserrat text-custom-light-600">
              Ajuste a busca/filtro ou volte para comprar mais produtos.
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/categorias">Ir para categorias</Link>
              </Button>
              <Button variant="outline" onClick={refresh}>
                Atualizar
              </Button>
            </div>
          </section>
        )}

        {filtered.length > 0 && (
          <div className="space-y-4">
            <OrdersTable pedidos={filtered} onViewDetails={viewDetails} />

            <div className="flex flex-col gap-3 rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="text-xs font-montserrat text-custom-light-600">
                Total de pedidos: <span className="font-semibold text-custom-dark-1000">{pedidosTotal}</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="text-xs font-montserrat text-custom-light-600">
                  Página <span className="font-semibold text-custom-dark-1000">{pedidosPage}</span> de{" "}
                  <span className="font-semibold text-custom-dark-1000">{pedidosTotalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-9 text-xs font-montserrat"
                    disabled={pedidosStatus === "loading" || pedidosPage <= 1}
                    onClick={() => {
                      if (!clienteId) return;
                      void loadPedidosByCliente({
                        clienteId,
                        page: Math.max(1, pedidosPage - 1),
                        pageSize: pedidosPageSize,
                      });
                    }}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 text-xs font-montserrat"
                    disabled={pedidosStatus === "loading" || pedidosPage >= pedidosTotalPages}
                    onClick={() => {
                      if (!clienteId) return;
                      void loadPedidosByCliente({
                        clienteId,
                        page: Math.min(pedidosTotalPages, pedidosPage + 1),
                        pageSize: pedidosPageSize,
                      });
                    }}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
