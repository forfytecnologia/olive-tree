import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { StoredImage } from "@/components/stored-image";
import { supabase } from "@/integrations/supabase/client";
import { coverImage, fetchProducts, formatPrice, stockTotal } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/produtos/")({
  component: ProdutosAdmin,
});

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  esgotado: "Esgotado",
  rascunho: "Rascunho",
};

function ProdutosAdmin() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts({ includeDrafts: true }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("products").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Status atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Produto excluído.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl">Produtos</h1>
        <Link
          to="/admin/produtos/$id"
          params={{ id: "novo" }}
          className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground"
        >
          Novo produto
        </Link>
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Carregando…</p>}

      <div className="mt-8 space-y-3">
        {products.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-4 bg-card p-4">
            <div className="h-20 w-16 overflow-hidden bg-muted">
              <StoredImage
                reference={coverImage(p)}
                alt={p.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-40 flex-1">
              <p className="text-sm">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.categories?.name ?? "Sem categoria"} · {formatPrice(p.price)} ·{" "}
                {stockTotal(p)} un. · {p.views} visualizações
              </p>
            </div>
            <select
              value={p.status}
              onChange={(e) => toggle.mutate({ id: p.id, status: e.target.value })}
              className="border border-border bg-background px-3 py-2 text-xs"
              aria-label={`Status de ${p.name}`}
            >
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Link
              to="/admin/produtos/$id"
              params={{ id: p.id }}
              className="text-xs uppercase tracking-[0.2em] underline underline-offset-4"
            >
              Editar
            </Link>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Excluir "${p.name}"?`)) remove.mutate(p.id);
              }}
              className="text-xs uppercase tracking-[0.2em] text-destructive"
            >
              Excluir
            </button>
          </div>
        ))}
      </div>

      {!isLoading && products.length === 0 && (
        <p className="mt-10 text-muted-foreground">Nenhum produto cadastrado ainda.</p>
      )}
    </div>
  );
}
