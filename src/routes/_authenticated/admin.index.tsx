import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { fetchProducts, formatPrice, stockTotal } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card p-6">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-3xl font-light">{value}</p>
    </div>
  );
}

function Dashboard() {
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts({ includeDrafts: true }),
  });

  const ativos = products.filter((p) => p.status === "ativo");
  const rascunhos = products.filter((p) => p.status === "rascunho");
  const lowStock = products.filter((p) => stockTotal(p) <= 3);
  const mostViewed = [...products].sort((a, b) => b.views - a.views).slice(0, 5);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl">Painel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão geral do catálogo.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Produtos ativos" value={ativos.length} />
        <Stat label="Rascunhos" value={rascunhos.length} />
        <Stat label="Estoque baixo" value={lowStock.length} />
        <Stat label="Total no catálogo" value={products.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-card p-6">
          <p className="eyebrow">Estoque baixo ou zerado</p>
          <ul className="mt-4 space-y-3 text-sm">
            {lowStock.length === 0 && <li className="text-muted-foreground">Tudo abastecido.</li>}
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4">
                <Link
                  to="/admin/produtos/$id"
                  params={{ id: p.id }}
                  className="underline underline-offset-4"
                >
                  {p.name}
                </Link>
                <span className="text-muted-foreground">{stockTotal(p)} un.</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card p-6">
          <p className="eyebrow">Mais visualizados</p>
          <ul className="mt-4 space-y-3 text-sm">
            {mostViewed.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4">
                <span>{p.name}</span>
                <span className="text-muted-foreground">
                  {p.views} · {formatPrice(p.price)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Link
        to="/admin/produtos/$id"
        params={{ id: "novo" }}
        className="inline-block bg-primary px-8 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground"
      >
        Novo produto
      </Link>
    </div>
  );
}
