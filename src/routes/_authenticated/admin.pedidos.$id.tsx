import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { formatPrice } from "@/lib/catalog";
import { FULFILLMENT_STATUS, PAYMENT_STATUS, fetchOrder, updateOrder } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/admin/pedidos/$id")({
  component: OrderDetail,
});

const FIELD = "mt-1 w-full border border-border bg-background px-3 py-2 text-sm";

function OrderDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => fetchOrder(id),
  });

  const [payment, setPayment] = useState("aguardando");
  const [fulfillment, setFulfillment] = useState("preparando");
  const [tracking, setTracking] = useState("");

  useEffect(() => {
    if (!order) return;
    setPayment(order.payment_status);
    setFulfillment(order.fulfillment_status);
    setTracking(order.tracking_code);
  }, [order]);

  if (isLoading) return <p className="text-muted-foreground">Carregando pedido…</p>;
  if (!order) return <p className="text-muted-foreground">Pedido não encontrado.</p>;

  async function save() {
    try {
      await updateOrder(id, {
        payment_status: payment,
        fulfillment_status: fulfillment,
        tracking_code: tracking,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Pedido atualizado.");
    } catch {
      toast.error("Não foi possível salvar.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/admin/pedidos" className="text-xs uppercase tracking-[0.2em] opacity-60">
          ← Pedidos
        </Link>
        <h1 className="mt-2 text-2xl">Pedido nº {order.order_number}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date(order.created_at).toLocaleString("pt-BR")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-card p-6">
          <p className="eyebrow">Cliente</p>
          <p className="mt-3 text-sm">
            {order.customer_name}
            <br />
            {order.customer_email}
            <br />
            {order.customer_phone}
            <br />
            CPF {order.customer_document || "—"}
          </p>
        </section>

        <section className="bg-card p-6">
          <p className="eyebrow">Entrega</p>
          <p className="mt-3 text-sm">
            {order.street}, {order.number} {order.complement}
            <br />
            {order.district} — {order.city}/{order.state}
            <br />
            CEP {order.zip}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {order.shipping_carrier} {order.shipping_service} · até {order.shipping_days} dias úteis
            · {order.shipping_price === 0 ? "grátis" : formatPrice(order.shipping_price)}
          </p>
        </section>
      </div>

      <section className="bg-card p-6">
        <p className="eyebrow">Itens</p>
        <div className="mt-4 space-y-3 text-sm">
          {(order.order_items ?? []).map((i) => (
            <div key={i.id} className="flex justify-between gap-4 border-b border-border/60 pb-3">
              <span>
                {i.product_name}
                <span className="block text-xs text-muted-foreground">
                  {[i.size, i.color].filter(Boolean).join(" · ")} · {i.quantity} un.
                </span>
              </span>
              <span>{formatPrice(i.unit_price * i.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 text-base">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </section>

      <section className="bg-card p-6">
        <p className="eyebrow">Status</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            Pagamento
            <select className={FIELD} value={payment} onChange={(e) => setPayment(e.target.value)}>
              {PAYMENT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Envio
            <select
              className={FIELD}
              value={fulfillment}
              onChange={(e) => setFulfillment(e.target.value)}
            >
              {FULFILLMENT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Código de rastreio
            <input
              className={FIELD}
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={save}
          className="mt-6 bg-primary px-8 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground hover:opacity-90"
        >
          Salvar
        </button>
      </section>
    </div>
  );
}
