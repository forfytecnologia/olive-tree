import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site-chrome";
import { formatPrice } from "@/lib/catalog";
import {
  createPayment,
  PAYMENT_LABEL,
  type PaymentIntent,
  type PaymentMethod,
} from "@/lib/payments";
import { confirmMockPayment, getPublicOrder } from "@/lib/orders.functions";
import { createMercadoPagoCheckout } from "@/lib/payments.functions";

export const Route = createFileRoute("/pedido/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: typeof search["status"] === "string" ? (search["status"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pedido confirmado — Olive Tree Acessórios" },
      { name: "description", content: "Acompanhe os detalhes e o pagamento do seu pedido." },
      { property: "og:title", content: "Pedido Olive Tree" },
      { property: "og:description", content: "Detalhes do seu pedido Olive Tree." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PedidoPage,
});

function PedidoPage() {
  const { id } = Route.useParams();
  const { status } = Route.useSearch();
  const queryClient = useQueryClient();
  const loadOrder = useServerFn(getPublicOrder);
  const confirmPayment = useServerFn(confirmMockPayment);
  const startCheckout = useServerFn(createMercadoPagoCheckout);

  const { data: order, isLoading } = useQuery({
    queryKey: ["public-order", id],
    queryFn: () => loadOrder({ data: { id } }),
    // Voltando do Mercado Pago, o aviso de pagamento pode levar alguns segundos.
    refetchInterval: (query) => {
      const current = query.state.data;
      if (!current || current.payment_status === "pago") return false;
      return status ? 4000 : false;
    },
  });
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const hasLivePayment = Boolean(order?.payment_link);

  useEffect(() => {
    if (!order || order.payment_status === "pago" || order.payment_link) return;
    createPayment({
      method: order.payment_method as PaymentMethod,
      total: order.total,
      orderId: order.id,
    }).then(setIntent);
  }, [order]);

  async function payNow() {
    if (!order) return;
    setRedirecting(true);
    try {
      const res = await startCheckout({ data: { orderId: order.id } });
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      toast.error(res.error ?? "Pagamento online indisponível no momento.");
    } catch {
      toast.error("Não foi possível abrir o pagamento.");
    } finally {
      setRedirecting(false);
    }
  }

  if (isLoading) {
    return (
      <SiteLayout>
        <p className="mx-auto max-w-3xl px-5 py-24 text-muted-foreground">Carregando pedido…</p>
      </SiteLayout>
    );
  }

  if (!order) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h1 className="text-2xl">Pedido não encontrado</h1>
          <Link to="/catalogo" className="mt-6 inline-block text-sm underline underline-offset-4">
            Voltar ao catálogo
          </Link>
        </div>
      </SiteLayout>
    );
  }

  async function handleConfirm() {
    if (!order) return;
    try {
      await confirmPayment({ data: { id: order.id, reference: intent?.reference ?? "SIM" } });
      await queryClient.invalidateQueries({ queryKey: ["public-order", order.id] });
      toast.success("Pagamento simulado confirmado.");
    } catch {
      toast.error("Não foi possível confirmar o pagamento.");
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-5 py-16">
        <p className="eyebrow">Pedido nº {order.order_number}</p>
        <h1 className="mt-2 text-3xl">Obrigada pela sua compra!</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enviamos os detalhes para {order.customer_email}. Assim que o pagamento for confirmado,
          preparamos seu envio.
        </p>

        <section className="mt-10 bg-card p-6">
          <p className="eyebrow">
            Pagamento — {PAYMENT_LABEL[order.payment_method as PaymentMethod]}
          </p>
          <p className="mt-2 text-sm">
            Status: <strong>{order.payment_status}</strong>
          </p>

          {status && order.payment_status !== "pago" && (
            <p className="mt-3 text-sm text-muted-foreground">
              {status === "sucesso"
                ? "Recebemos o retorno do pagamento. Estamos confirmando com o banco — esta página atualiza sozinha."
                : status === "pendente"
                  ? "O pagamento ficou pendente de confirmação. Assim que for aprovado, atualizamos aqui."
                  : "O pagamento não foi concluído. Você pode tentar novamente abaixo."}
            </p>
          )}

          {order.payment_status !== "pago" && !hasLivePayment && intent?.pix_code && (
            <div className="mt-4">
              <p className="text-sm">Chave Pix: {intent.pix_key}</p>
              <p className="mt-2 break-all border border-dashed border-border p-3 text-xs text-muted-foreground">
                {intent.pix_code}
              </p>
            </div>
          )}
          {order.payment_status !== "pago" && !hasLivePayment && intent?.boleto_line && (
            <p className="mt-4 border border-dashed border-border p-3 text-xs text-muted-foreground">
              {intent.boleto_line}
            </p>
          )}

          {order.payment_status !== "pago" && hasLivePayment && (
            <button
              type="button"
              onClick={payNow}
              disabled={redirecting}
              className="mt-5 bg-primary px-8 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground disabled:opacity-60"
            >
              {redirecting ? "Abrindo pagamento…" : "Pagar agora"}
            </button>
          )}

          {order.payment_status !== "pago" && !hasLivePayment && (
            <button
              type="button"
              onClick={handleConfirm}
              className="mt-5 border border-border px-6 py-3 text-xs uppercase tracking-[0.2em]"
            >
              Simular pagamento aprovado
            </button>
          )}
        </section>

        <section className="mt-6 bg-card p-6">
          <p className="eyebrow">Itens</p>
          <div className="mt-4 space-y-2 text-sm">
            {order.order_items.map((i) => (
              <div key={i.id} className="flex justify-between gap-4">
                <span>
                  {i.product_name}
                  <span className="block text-xs text-muted-foreground">
                    {[i.size, i.color].filter(Boolean).join(" · ")} · {i.quantity} un.
                  </span>
                </span>
                <span>{formatPrice(i.unit_price * i.quantity)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 bg-card p-6">
          <p className="eyebrow">Entrega</p>
          <p className="mt-3 text-sm">
            {order.street}, {order.number} {order.complement} — {order.district}
            <br />
            {order.city}/{order.state} · CEP {order.zip}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {order.shipping_carrier} {order.shipping_service} · até {order.shipping_days} dias úteis
          </p>
        </section>

        <section className="mt-6 bg-card p-6 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.subtotal + order.shipping_price - order.total > 0.001 && (
            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Desconto Pix (5%)</span>
              <span>
                - {formatPrice(order.subtotal + order.shipping_price - order.total)}
              </span>
            </div>
          )}
          <div className="mt-2 flex justify-between">
            <span className="text-muted-foreground">Frete</span>
            <span>{order.shipping_price === 0 ? "Grátis" : formatPrice(order.shipping_price)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-base">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </section>

        <Link to="/catalogo" className="mt-10 inline-block text-sm underline underline-offset-4">
          Continuar comprando
        </Link>
      </div>
    </SiteLayout>
  );
}
