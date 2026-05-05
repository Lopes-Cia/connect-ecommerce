"use client";

import { MoreHorizontal, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatting";
import type { PedidoResumoUI } from "@/stores/pedidos-store";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(time));
}

function normalizeStatusLabel(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Desconhecido";
  const normalized = raw.toLowerCase();
  if (normalized === "pago") return "Pago";
  if (normalized === "pendente") return "Pendente";
  if (normalized === "cancelado") return "Cancelado";
  if (normalized === "processando") return "Processando";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "pago" || normalized === "entregue") return "default";
  if (normalized === "processando") return "secondary";
  if (normalized === "cancelado") return "destructive";
  if (normalized === "pendente") return "outline";
  return "secondary";
}

type Props = {
  pedidos: PedidoResumoUI[];
  onViewDetails: (pedidoId: number) => void;
};

export default function OrdersTable({ pedidos, onViewDetails }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-custom-light-300 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-custom-light-100/60">
            <TableHead className="w-[220px]">Pedido</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Pag.</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="hidden md:table-cell">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.map((pedido) => (
            <TableRow key={pedido.pedidoId} className="hover:bg-custom-light-100/40">
              <TableCell>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onViewDetails(pedido.pedidoId)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <span className="truncate font-montserrat text-sm font-semibold text-custom-dark-1000">
                        #{pedido.pedidoId}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-montserrat text-custom-dark-700 md:hidden">
                      <span>{formatDateTime(pedido.createdAt)}</span>
                      <span>•</span>
                      <span>
                        {pedido.itensCount} item{pedido.itensCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <Badge variant={statusBadgeVariant(pedido.status)} className="text-[11px]">
                  {normalizeStatusLabel(pedido.status)}
                </Badge>
              </TableCell>

              <TableCell className="hidden lg:table-cell">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-montserrat text-custom-dark-700">{pedido.pagamentoMetodo}</div>
                </div>
              </TableCell>

              <TableCell className="text-right">
                <div className="font-montserrat text-sm font-semibold text-custom-dark-1000">
                  {formatCurrency(pedido.total)}
                </div>
              </TableCell>

              <TableCell className="hidden md:table-cell">
                <div className="text-xs font-montserrat text-custom-dark-700">{formatDateTime(pedido.createdAt)}</div>
              </TableCell>

            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

