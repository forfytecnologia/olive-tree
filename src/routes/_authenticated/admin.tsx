import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import mark from "@/assets/mark-cream-t.png.asset.json";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const LINKS = [
  { to: "/admin", label: "Painel", exact: true },
  { to: "/admin/pedidos", label: "Pedidos", exact: false },
  { to: "/admin/produtos", label: "Produtos", exact: false },
  { to: "/admin/categorias", label: "Categorias", exact: false },
  { to: "/admin/envio", label: "Envio", exact: false },
  { to: "/admin/config", label: "Configurações", exact: false },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="surface-wine">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={mark.url} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="wordmark text-sm">Olive Tree</span>
          </Link>
          <nav className="flex flex-wrap gap-6 text-sm">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.exact }}
                className="opacity-70 hover:opacity-100"
                activeProps={{ className: "opacity-100 underline underline-offset-8" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={signOut}
            className="ml-auto text-xs uppercase tracking-[0.2em] opacity-70 hover:opacity-100"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        {isLoading ? (
          <p className="text-muted-foreground">Verificando acesso…</p>
        ) : isAdmin ? (
          <Outlet />
        ) : (
          <div className="bg-card p-10">
            <h1 className="text-xl">Acesso restrito</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta conta não tem permissão de administrador.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
