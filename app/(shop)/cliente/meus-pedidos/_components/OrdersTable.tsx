"use client";

import { MoreHorizontal, Copy, Eye } from "lucide-react";

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
  onCopyPedidoId: (pedidoId: number) => void;
};

export default function OrdersTable({ pedidos, onViewDetails, onCopyPedidoId }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-custom-light-300 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-custom-light-100/60">
            <TableHead className="w-[220px]">Pedido</TableHead>
            <TableHead className="hidden md:table-cell">Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="hidden lg:table-cell">Itens</TableHead>
            <TableHead className="hidden lg:table-cell">Pagamento</TableHead>
            <TableHead className="hidden xl:table-cell">Entrega</TableHead>
            <TableHead className="w-[52px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.map((pedido) => (
            <TableRow key={pedido.pedidoId} className="hover:bg-custom-light-100/40">
              <TableCell>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-montserrat text-sm font-semibold text-custom-dark-1000">
                        #{pedido.pedidoId}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onCopyPedidoId(pedido.pedidoId)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
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

              <TableCell className="hidden md:table-cell">
                <div className="text-xs font-montserrat text-custom-dark-700">{formatDateTime(pedido.createdAt)}</div>
              </TableCell>

              <TableCell>
                <Badge variant={statusBadgeVariant(pedido.status)} className="text-[11px]">
                  {normalizeStatusLabel(pedido.status)}
                </Badge>
              </TableCell>

              <TableCell className="text-right">
                <div className="font-montserrat text-sm font-semibold text-custom-dark-1000">
                  {formatCurrency(pedido.total)}
                </div>
                <div className="text-[10px] font-montserrat uppercase tracking-wider text-custom-light-600">
                  {pedido.moeda}
                </div>
              </TableCell>

              <TableCell className="hidden lg:table-cell">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-montserrat text-custom-dark-700">
                    {pedido.itensCount} item{pedido.itensCount === 1 ? "" : "s"}
                  </div>
                  <Badge variant="secondary" className="w-fit text-[10px]">
                    {pedido.itensQuantidade} un.
                  </Badge>
                </div>
              </TableCell>

              <TableCell className="hidden lg:table-cell">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-montserrat text-custom-dark-700">{pedido.pagamentoMetodo}</div>
                  <Badge variant="outline" className="w-fit text-[10px]">
                    {pedido.pagamentoStatus}
                  </Badge>
                </div>
              </TableCell>

              <TableCell className="hidden xl:table-cell">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-montserrat text-custom-dark-700">
                    {pedido.entregaCidade || "—"}
                    {pedido.entregaUf ? `/${pedido.entregaUf}` : ""}
                  </div>
                  <div className="text-[11px] font-montserrat text-custom-light-600">
                    {pedido.freteNome || "Frete"}{" "}
                    {pedido.fretePrazoDias != null ? `• ${pedido.fretePrazoDias}d` : ""}
                  </div>
                </div>
              </TableCell>

              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => onViewDetails(pedido.pedidoId)}>
                      <Eye className="h-4 w-4" />
                      Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => onCopyPedidoId(pedido.pedidoId)}>
                      <Copy className="h-4 w-4" />
                      Copiar ID
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

