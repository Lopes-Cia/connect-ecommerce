import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { formatCurrency } from "@/lib/formatting";
import { slugify } from "@/lib/utils";
import { useClientesStore } from "@/stores/clientes-store";
import { frontModal } from "@/stores/front-modal-store";
import { buildPedidoMockupFromCarrinho, usePedidosStore } from "@/stores/pedidos-store";
import { useControlStore } from "@/stores/control-store";

const PRODUCT_IMAGE_FALLBACK = "/logo.png";

function normalizeUf(value: string): string {
  return String(value ?? "").trim().toUpperCase().slice(0, 2);
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toEnderecoLabel(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Endereço";
  const obj = value as Record<string, unknown>;
  const rua = safeString(obj.rua ?? obj.logradouro ?? obj.endereco ?? obj["endereço"]).trim();
  const numero = safeString(obj.numero ?? obj["número"] ?? obj.num).trim();
  const bairro = safeString(obj.bairro).trim();
  const cidade = safeString(obj.cidade ?? obj.municipio ?? obj["município"]).trim();
  const uf = safeString(obj.uf ?? obj.estado).trim();
  const cep = safeString(obj.cep ?? obj.CEP ?? obj.codigoPostal ?? obj.codigo_postal).trim();

  const left = [rua, numero && `nº ${numero}`].filter(Boolean).join(", ");
  const right = [bairro, [cidade, uf].filter(Boolean).join("-")].filter(Boolean).join(" • ");
  const extra = cep ? ` • ${cep}` : "";

  const label = [left, right].filter(Boolean).join(" — ");
  return (label || "Endereço") + extra;
}

export default function CheckoutForm() {
  const useCarrinhoStore = useControlStore((s) => s.CARRINHOSTORE);
  const items = useCarrinhoStore((s) => s.items);
  const totalAmount = useCarrinhoStore((s) => s.totalAmount);
  const totalItems = useCarrinhoStore((s) => s.totalItems);
  const loginData = useClientesStore((s) => s.loginData);

  const checkoutForm = usePedidosStore((s) => s.checkoutForm);
  const enderecoMode = usePedidosStore((s) => s.enderecoMode);
  const selectedEnderecoIndex = usePedidosStore((s) => s.selectedEnderecoIndex);
  const setCheckoutField = usePedidosStore((s) => s.setCheckoutField);
  const hydrateCheckoutFromLoginData = usePedidosStore((s) => s.hydrateCheckoutFromLoginData);
  const selectEnderecoFromLoginData = usePedidosStore((s) => s.selectEnderecoFromLoginData);
  const setEnderecoMode = usePedidosStore((s) => s.setEnderecoMode);

  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [isSendingGp, setIsSendingGp] = useState(false);

  useEffect(() => {
    hydrateCheckoutFromLoginData(loginData);
  }, [hydrateCheckoutFromLoginData, loginData]);

  const summary = useMemo(() => {
    return {
      totalItems,
      totalAmount,
    };
  }, [totalAmount, totalItems]);

  const enderecosList = useMemo(() => {
    const raw = loginData as Record<string, unknown> | null;
    const list = raw?.enderecos;
    return Array.isArray(list) ? list : [];
  }, [loginData]);

  async function onConfirm() {
    setUiMessage(null);
    setIsSendingGp(true);
    try {
      const pedido = buildPedidoMockupFromCarrinho(items);
      console.log(pedido);

      const url = "/api/dev/insert-dado-integration";
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idIntegradora: pedido.idIntegradora,
          tipo: pedido.tipo,
          orderId: pedido.orderId,
          payload: JSON.stringify(pedido.payload),
          integrado: pedido.integrado,
        }),
      });
      const responsePayload = await response.json().catch(() => null);
      const result = { url, method: "POST", status: response.status, ok: response.ok, payload: responsePayload };

      if (response.ok) {
        await useCarrinhoStore.getState().clearCart();
        void frontModal.success({
          title: "insertDadoIntegration (GP)",
          description: JSON.stringify(result, null, 2),
        });
        setUiMessage("Enviado para insertDadoIntegration (GP).");
      } else {
        void frontModal.error({
          title: "insertDadoIntegration (GP)",
          description: JSON.stringify(result, null, 2),
        });
        setUiMessage("Falha ao enviar para insertDadoIntegration (GP).");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao finalizar checkout.";
      setUiMessage(message);
      void frontModal.error({
        title: "Erro ao finalizar checkout",
        description: message,
      });
    } finally {
      setIsSendingGp(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 space-y-6">
        <div className="rounded-lg border border-custom-light-400 bg-white p-4 md:p-6">
          <h2 className="text-lg font-semibold text-custom-dark-1000">Dados do cliente</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-custom-dark-1000">Nome</label>
              <input
                value={checkoutForm.nome}
                onChange={(e) => setCheckoutField("nome", e.target.value)}
                className="mt-1 w-full rounded border border-custom-light-400 px-3 py-2 text-sm"
                placeholder="Seu nome completo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-custom-dark-1000">Telefone</label>
              <input
                value={checkoutForm.telefone}
                onChange={(e) => setCheckoutField("telefone", e.target.value)}
                className="mt-1 w-full rounded border border-custom-light-400 px-3 py-2 text-sm"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-custom-dark-1000">E-mail</label>
              <input
                value={checkoutForm.email}
                onChange={(e) => setCheckoutField("email", e.target.value)}
                className="mt-1 w-full rounded border border-custom-light-400 px-3 py-2 text-sm"
                placeholder="seu@email.com"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-custom-light-400 bg-white p-4 md:p-6">
          <h2 className="text-lg font-semibold text-custom-dark-1000">Endereço de entrega</h2>

          {enderecosList.length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-custom-dark-1000">
                  Usar endereço cadastrado
                </label>
                <select
                  value={
                    enderecoMode === "saved" && typeof selectedEnderecoIndex === "number"
                      ? String(selectedEnderecoIndex)
                      : "new"
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "new") {
                      setEnderecoMode("new");
                      return;
                    }
                    const nextIndex = Number.parseInt(value, 10);
                    if (Number.isNaN(nextIndex)) {
                      setEnderecoMode("new");
                      return;
                    }
                    selectEnderecoFromLoginData(loginData, nextIndex);
                  }}
                  className="mt-1 w-full rounded border border-custom-light-400 px-3 py-2 text-sm bg-white"
                >
                  <option value="new">Novo endereço</option>
                  {enderecosList.map((endereco, index) => (
                    <option key={index} value={String(index)}>
                      {toEnderecoLabel(endereco)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-custom-dark-1000">CEP</label>
              <input
                value={checkoutForm.endereco.cep}
                onChange={(e) => setCheckoutField("endereco.cep", e.target.value)}
                className="mt-1 w-full rounded border border-custom-light-400 px-3 py-2 text-sm"
                placeholder="00000-000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-custom-dark-1000">UF</label>
              <input
                value={checkoutForm.endereco.uf}
                onChange={(e) => setCheckoutField("endereco.uf", normalizeUf(e.target.value))}
                className="mt-1 w-full rounded border border-custom-light-400 px-3 py-2 text-sm"
                placeholder="UF"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-custom-dark-1000">Rua</label>
              <input
                value={checkoutForm.endereco.rua}
                onChange={(e) => setCheckoutField("endereco.rua", e.target.value)}
                className="mt-1 w-full rounded border border-custom-light-400 px-3 py-2 text-sm"
                placeholder="Rua / Avenida"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-custom-dark-1000">Número</label>
              <input
                value={checkoutForm.endereco.numero}
                onChange={(e) => setCheckoutField("endereco.numero", e.target.value)}
                className="mt-1 w-full rounded border border-custom-light-400 px-3 py-2 text-sm"
                placeholder="123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-custom-dark-1000">Complemento</label>
              <input
                value={checkoutForm.endereco.complemento}
                onChange={(e) => setCheckoutField("endereco.complemento", e.target.value)}
                className="mt-1 w-full rounded border border-custom-light-400 px-3 py-2 text-sm"
                placeholder="Apto, bloco, referência"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-custom-dark-1000">Bairro</label>
              <input
                value={checkoutForm.endereco.bairro}
                onChange={(e) => setCheckoutField("endereco.bairro", e.target.value)}
                className="mt-1 w-full rounded border border-custom-light-400 px-3 py-2 text-sm"
                placeholder="Bairro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-custom-dark-1000">Cidade</label>
              <input
                value={checkoutForm.endereco.cidade}
                onChange={(e) => setCheckoutField("endereco.cidade", e.target.value)}
                className="mt-1 w-full rounded border border-custom-light-400 px-3 py-2 text-sm"
                placeholder="Cidade"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-custom-light-400 bg-white p-4 md:p-6">
          <h2 className="text-lg font-semibold text-custom-dark-1000">Pagamento</h2>
          <div className="mt-4 rounded border border-custom-light-400 px-3 py-2 text-sm text-custom-dark-1000">
            Pix
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-custom-dark-1000">Observações</label>
            <textarea
              value={checkoutForm.observacoes}
              onChange={(e) => setCheckoutField("observacoes", e.target.value)}
              className="mt-1 w-full rounded border border-custom-light-400 px-3 py-2 text-sm min-h-24"
              placeholder="Ex.: entregar na portaria, sem cebola, etc."
            />
          </div>
        </div>

        {uiMessage && (
          <div className="rounded-lg border border-custom-light-400 bg-white p-4">
            <div className="text-sm text-custom-dark-1000">{uiMessage}</div>
          </div>
        )}
      </section>

      <aside className="rounded-lg border border-custom-light-400 bg-white p-4 md:p-6 h-fit">
        <h2 className="text-lg font-semibold text-custom-dark-1000">Resumo do pedido</h2>

        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const itemSlug = slugify(item.name) || encodeURIComponent(item.id);
            const productHref = `/produtos/${itemSlug}`;
            return (
              <div key={item.id} className="flex items-center gap-3">
                <Link href={productHref} className="w-12 h-12 shrink-0">
                  <div className="w-12 h-12 rounded border border-custom-light-300 overflow-hidden flex items-center justify-center bg-custom-light-100">
                    <img
                      src={item.imageUrl || PRODUCT_IMAGE_FALLBACK}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      onError={(event) => {
                        const img = event.currentTarget;
                        if (img.src.endsWith(PRODUCT_IMAGE_FALLBACK)) return;
                        img.src = PRODUCT_IMAGE_FALLBACK;
                      }}
                    />
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={productHref} className="block text-sm font-medium text-custom-dark-1000 line-clamp-2 hover:underline">
                    {item.name}
                  </Link>
                  <div className="text-xs text-custom-dark-700">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </div>
                </div>
                <div className="text-sm font-semibold text-custom-dark-1000">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-custom-light-300 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Itens</span>
            <span>{summary.totalItems}</span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(summary.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Frete</span>
            <span>A calcular</span>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold text-tints-french-blue">{formatCurrency(summary.totalAmount)}</span>
        </div>

        <button
          type="button"
          className="mt-4 w-full py-3 rounded bg-tints-french-blue text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => void onConfirm()}
          disabled={isSendingGp || items.length === 0}
        >
          {isSendingGp ? "Enviando..." : "Finalizar pedido"}
        </button>

        <Link
          href="/cart"
          className="mt-3 block w-full py-3 rounded border border-custom-light-400 bg-white text-custom-dark-1000 font-semibold hover:bg-custom-light-100 text-center"
        >
          Voltar ao carrinho
        </Link>
      </aside>
    </div>
  )
}
