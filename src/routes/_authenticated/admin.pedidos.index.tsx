import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { formatPrice } from "@/lib/catalog";
import { fetchOrders } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/admin/pedidos/")({
  component: OrdersList,
});

function OrdersList() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: fetchOrders,
  });

  return (
    <div>
      <h1 className="text-2xl">Pedidos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Todas as compras feitas pelo site, com pagamento e envio.
      </p>

      <div className="mt-8 overflow-x-auto bg-card">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-4 font-normal">Nº</th>
              <th className="p-4 font-normal">Cliente</th>
              <th className="p-4 font-normal">Data</th>
              <th className="p-4 font-normal">Pagamento</th>
              <th className="p-4 font-normal">Envio</th>
              <th className="p-4 font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-6 text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-muted-foreground">
                  Nenhum pedido ainda.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border/60">
                <td className="p-4">
                  <Link
                    to="/admin/pedidos/$id"
                    params={{ id: o.id }}
                    className="underline underline-offset-4"
                  >
                    {o.order_number}
                  </Link>
                </td>
                <td className="p-4">
                  {o.customer_name}
                  <span className="block text-xs text-muted-foreground">{o.customer_email}</span>
                </td>
                <td className="p-4 text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="p-4">{o.payment_status}</td>
                <td className="p-4">{o.fulfillment_status}</td>
                <td className="p-4">{formatPrice(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
