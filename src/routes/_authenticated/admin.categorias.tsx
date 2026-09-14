import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fetchCategories, slugify, type Category } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: CategoriasAdmin,
});

const inputClass =
  "w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary";

function CategoriasAdmin() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchCategories(true),
  });

  const invalidate = () => queryClient.invalidateQueries();

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("categories").insert({
        name: name.trim().slice(0, 60),
        slug: slugify(name),
        position: categories.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      invalidate();
      toast.success("Categoria criada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Category> }) => {
      const { error } = await supabase.from("categories").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Categoria excluída.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function move(index: number, direction: -1 | 1) {
    const a = categories[index];
    const b = categories[index + direction];
    if (!a || !b) return;
    update.mutate({ id: a.id, patch: { position: b.position } });
    update.mutate({ id: b.id, patch: { position: a.position } });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl">Categorias</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
        className="mt-6 flex gap-3"
      >
        <input
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova categoria"
          className={inputClass}
        />
        <button
          type="submit"
          className="bg-primary px-6 text-xs uppercase tracking-[0.2em] text-primary-foreground"
        >
          Criar
        </button>
      </form>

      <div className="mt-8 space-y-3">
        {categories.map((c, i) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 bg-card p-4">
            <input
              defaultValue={c.name}
              maxLength={60}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && value !== c.name) update.mutate({ id: c.id, patch: { name: value } });
              }}
              className="flex-1 border-0 bg-transparent text-sm outline-none"
              aria-label="Nome da categoria"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={c.active}
                onChange={(e) => update.mutate({ id: c.id, patch: { active: e.target.checked } })}
                className="h-4 w-4 accent-primary"
              />
              Ativa
            </label>
            <button
              type="button"
              onClick={() => move(i, -1)}
              className="px-2 text-sm"
              aria-label="Mover para cima"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              className="px-2 text-sm"
              aria-label="Mover para baixo"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Excluir "${c.name}"?`)) remove.mutate(c.id);
              }}
              className="text-xs uppercase tracking-[0.2em] text-destructive"
            >
              Excluir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
