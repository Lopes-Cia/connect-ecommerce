"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Package, Truck, QrCode, Wallet } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatCurrency } from "@/lib/formatting";
import { useControlStore } from "@/stores/control-store";
import { frontModal } from "@/stores/front-modal-store";
import type { PedidoDetalheUI } from "@/stores/pedidos-store";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

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

function formatEndereco(endereco: Record<string, unknown> | null): { title: string; lines: string[] } {
  if (!endereco) return { title: "Endereço", lines: ["—"] };
  const logradouro = safeString(endereco.logradouro ?? endereco.rua ?? endereco.endereco ?? endereco["endereço"]).trim();
  const numero = safeString(endereco.numero ?? endereco["número"] ?? endereco.num).trim();
  const bairro = safeString(endereco.bairro).trim();
  const cidade = safeString(endereco.cidade ?? endereco.municipio ?? endereco["município"]).trim();
  const uf = safeString(endereco.uf ?? endereco.estado).trim();
  const cep = safeString(endereco.cep ?? endereco.CEP).trim();
  const complemento = safeString(endereco.complemento).trim();

  const title = [logradouro, numero].filter(Boolean).join(", ") || "Endereço";
  const line1 = [bairro, [cidade, uf].filter(Boolean).join(" / ")].filter(Boolean).join(" • ") || "—";
  const line2 = [cep && `CEP ${cep}`, complemento].filter(Boolean).join(" • ");
  return { title, lines: [line1, line2].filter((x) => x && x !== "—") || ["—"] };
}

function parsePedidoIdParam(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(id) ? id : null;
}

function buildResumo(pedido: PedidoDetalheUI): Array<{ label: string; value: string }> {
  const rawResumo = asRecord(pedido.raw?.resumo);
  const subtotal = safeNumber(rawResumo?.subtotal, 0);
  const desconto = safeNumber(rawResumo?.desconto, 0);
  const frete = safeNumber(rawResumo?.frete, 0);
  return [
    { label: "Subtotal", value: formatCurrency(subtotal) },
    { label: "Desconto", value: desconto > 0 ? `- ${formatCurrency(desconto)}` : formatCurrency(0) },
    { label: "Frete", value: frete > 0 ? formatCurrency(frete) : "—" },
  ];
}

export default function PedidoDetalhePage() {
  const router = useRouter();
  const params = useParams<{ pedidoId: string }>();
  const openedLoginModalRef = useRef(false);

  const useClientesStore = useControlStore((s) => s.CLIENTESSTORE);
  const usePedidosStore = useControlStore((s) => s.PEDIDOSSTORE);

  const isLoggedIn = useClientesStore((s) => s.isLoggedIn);
  const selectedStatus = usePedidosStore((s) => s.selectedPedidoStatus);
  const selectedError = usePedidosStore((s) => s.selectedPedidoError);
  const selectedPedido = usePedidosStore((s) => s.selectedPedido);
  const loadPedidoById = usePedidosStore((s) => s.loadPedidoById);

  const pedidoId = useMemo(() => parsePedidoIdParam(params?.pedidoId), [params?.pedidoId]);

  useEffect(() => {
    if (isLoggedIn) return;
    if (openedLoginModalRef.current) return;
    openedLoginModalRef.current = true;

    void (async () => {
      const confirmed = await frontModal.confirm({
        title: "Login necessário",
        description: "Faça login para visualizar este pedido.",
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
    if (!pedidoId) return;
    void loadPedidoById(pedidoId);
  }, [isLoggedIn, loadPedidoById, pedidoId]);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      void frontModal.success({ title: "Copiado", description: `${label} copiado.` });
    } catch {
      void frontModal.error({
        title: "Não foi possível copiar",
        description: "Seu navegador bloqueou a cópia para a área de transferência.",
      });
    }
  }

  if (!isLoggedIn) return null;

  if (!pedidoId) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f6f7f9_0%,#ffffff_34%,#ffffff_100%)] p-3 sm:p-5 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <Alert variant="destructive">
            <AlertTitle>Pedido inválido</AlertTitle>
            <AlertDescription>O identificador do pedido não é válido.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f7f9_0%,#ffffff_34%,#ffffff_100%)] p-3 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/cliente/meus-pedidos">Meus pedidos</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Pedido #{pedidoId}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="flex items-center gap-3">
                <h1 className="text-xl font-league-spartan font-bold text-custom-dark-1000 sm:text-2xl">
                  Pedido #{pedidoId}
                </h1>
                {selectedPedido && (
                  <Badge variant={statusBadgeVariant(selectedPedido.status)} className="text-[11px]">
                    {normalizeStatusLabel(selectedPedido.status)}
                  </Badge>
                )}
              </div>
              <p className="text-xs font-montserrat text-custom-dark-700 sm:text-sm">
                Detalhes do pedido, itens, entrega e pagamento.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" className="gap-2" onClick={() => router.push("/cliente/meus-pedidos")}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                disabled={selectedStatus === "loading"}
                onClick={() => void loadPedidoById(pedidoId)}
              >
                Atualizar
              </Button>
            </div>
          </div>
        </section>

        {selectedStatus === "error" && (
          <Alert variant="destructive">
            <AlertTitle>Falha ao carregar pedido</AlertTitle>
            <AlertDescription>{selectedError || "Erro inesperado"}</AlertDescription>
          </Alert>
        )}

        {selectedStatus === "loading" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-custom-light-300 shadow-sm">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="text-sm font-montserrat">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-5 sm:px-5">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-44" />
              </CardContent>
            </Card>
            <Card className="border-custom-light-300 shadow-sm lg:col-span-2">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="text-sm font-montserrat">Itens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-5 sm:px-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        )}

        {selectedStatus === "success" && selectedPedido && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-custom-light-300 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-5">
                <CardTitle className="text-sm font-montserrat">Resumo</CardTitle>
                <Package className="h-4 w-4 text-custom-light-600" />
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-5 sm:px-5">
                <div className="space-y-1">
                  <div className="text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
                    Total
                  </div>
                  <div className="text-xl font-league-spartan font-bold text-custom-dark-1000">
                    {formatCurrency(selectedPedido.total)}
                  </div>
                  <div className="text-xs font-montserrat text-custom-light-600">
                    {selectedPedido.itensCount} item{selectedPedido.itensCount === 1 ? "" : "s"} •{" "}
                    {selectedPedido.itensQuantidade} un.
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-montserrat text-custom-light-600">Status</span>
                    <Badge variant={statusBadgeVariant(selectedPedido.status)} className="text-[11px]">
                      {normalizeStatusLabel(selectedPedido.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-montserrat text-custom-light-600">Data</span>
                    <span className="text-xs font-montserrat text-custom-dark-1000">
                      {formatDateTime(selectedPedido.createdAt)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  {buildResumo(selectedPedido).map((line) => (
                    <div key={line.label} className="flex items-center justify-between text-xs font-montserrat">
                      <span className="text-custom-light-600">{line.label}</span>
                      <span className="font-semibold text-custom-dark-1000">{line.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4 lg:col-span-2">
              <Card className="border-custom-light-300 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-5">
                  <CardTitle className="text-sm font-montserrat">Itens do pedido</CardTitle>
                  <Package className="h-4 w-4 text-custom-light-600" />
                </CardHeader>
                <CardContent className="px-0 pb-5">
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-custom-light-100/60">
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="hidden sm:table-cell text-right">Unit.</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPedido.itens.map((item) => (
                          <TableRow key={`${item.itemId ?? item.produtoId ?? item.nome}-${item.subtotal}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-custom-light-300 bg-custom-light-100">
                                  <img
                                    src={item.imagemUrl || "/logo.png"}
                                    alt={item.nome}
                                    className="h-full w-full object-contain"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-montserrat font-semibold text-custom-dark-1000">
                                    {item.nome || "Produto"}
                                  </div>
                                  {item.sku && (
                                    <div className="truncate text-[11px] font-montserrat text-custom-light-600">
                                      {item.sku}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm font-montserrat text-custom-dark-1000">
                              {item.quantidade}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right text-sm font-montserrat text-custom-dark-1000">
                              {formatCurrency(item.precoUnitario)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-montserrat font-semibold text-custom-dark-1000">
                              {formatCurrency(item.subtotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="border-custom-light-300 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-5">
                    <CardTitle className="text-sm font-montserrat">Entrega</CardTitle>
                    <Truck className="h-4 w-4 text-custom-light-600" />
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-5 sm:px-5">
                    {(() => {
                      const { title, lines } = formatEndereco(selectedPedido.enderecoEntrega);
                      return (
                        <div className="space-y-1">
                          <div className="text-sm font-montserrat font-semibold text-custom-dark-1000">{title}</div>
                          {lines.map((line) => (
                            <div key={line} className="text-xs font-montserrat text-custom-dark-700">
                              {line}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <Separator />

                    <div className="space-y-1">
                      <div className="text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
                        Frete
                      </div>
                      <div className="text-sm font-montserrat text-custom-dark-1000">
                        {selectedPedido.freteNome || "—"}
                      </div>
                      <div className="text-xs font-montserrat text-custom-light-600">
                        {selectedPedido.fretePrazoDias != null ? `${selectedPedido.fretePrazoDias} dias` : "—"} •{" "}
                        {selectedPedido.fretePreco != null ? formatCurrency(selectedPedido.fretePreco) : "—"}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-custom-light-300 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-5">
                    <CardTitle className="text-sm font-montserrat">Pagamento</CardTitle>
                    <Wallet className="h-4 w-4 text-custom-light-600" />
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-5 sm:px-5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-montserrat text-custom-light-600">Método</div>
                      <div className="text-sm font-montserrat font-semibold text-custom-dark-1000">
                        {selectedPedido.pagamentoMetodo}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-montserrat text-custom-light-600">Status</div>
                      <Badge variant="outline" className="text-[11px]">
                        {selectedPedido.pagamentoStatus}
                      </Badge>
                    </div>

                    {selectedPedido.pix && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <QrCode className="h-4 w-4 text-custom-light-600" />
                              <div className="text-sm font-montserrat font-semibold text-custom-dark-1000">Pix</div>
                            </div>
                            <Button
                              variant="outline"
                              className="h-9 gap-2 text-xs font-montserrat"
                              onClick={() => void copyText("Copia e cola", selectedPedido.pix!.copiaECola)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copiar
                            </Button>
                          </div>
                          <div className="rounded-md border border-custom-light-300 bg-custom-light-100 p-3 text-xs font-mono text-custom-dark-1000 break-words">
                            {selectedPedido.pix.copiaECola}
                          </div>
                          <div className="text-[11px] font-montserrat text-custom-light-600">
                            {selectedPedido.pix.expiresAt
                              ? `Expira em ${formatDateTime(selectedPedido.pix.expiresAt)}`
                              : "Sem expiração informada"}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

