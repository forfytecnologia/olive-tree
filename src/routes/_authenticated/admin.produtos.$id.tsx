import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StoredImage } from "@/components/stored-image";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchCategories,
  fetchProductById,
  slugify,
  type ProductStatus,
} from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/produtos/$id")({
  component: ProdutoForm,
});

const DEFAULT_SIZES = ["Único"];

type SizeRow = { size: string; stock: number };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary";

function ProdutoForm() {
  const { id } = Route.useParams();
  const isNew = id === "novo";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchCategories(true),
  });
  const { data: product } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => fetchProductById(id),
    enabled: !isNew,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [price, setPrice] = useState("0");
  const [colors, setColors] = useState("");
  const [status, setStatus] = useState<ProductStatus>("rascunho");
  const [featured, setFeatured] = useState(false);
  const [sizes, setSizes] = useState<SizeRow[]>(DEFAULT_SIZES.map((s) => ({ size: s, stock: 0 })));
  const [images, setImages] = useState<{ id?: string; url: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setDescription(product.description ?? "");
    setCategoryId(product.category_id ?? "");
    setPrice(String(product.price));
    setColors(product.colors.join(", "));
    setStatus(product.status);
    setFeatured(product.featured);
    setSizes(
      product.product_variants.length
        ? product.product_variants.map((v) => ({ size: v.size, stock: v.stock }))
        : DEFAULT_SIZES.map((s) => ({ size: s, stock: 0 })),
    );
    setImages(product.product_images.map((i) => ({ id: i.id, url: i.url })));
  }, [product]);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: { url: string }[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file);
        if (error) throw error;
        uploaded.push({ url: path });
      }
      setImages((prev) => [...prev, ...uploaded]);
      toast.success("Foto(s) enviada(s).");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim().slice(0, 120),
        slug: slugify(name) || crypto.randomUUID().slice(0, 8),
        description: description.trim().slice(0, 2000) || null,
        category_id: categoryId || null,
        price: Number(price) || 0,
        colors: colors
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, 12),
        status,
        featured,
      };

      let productId = isNew ? null : id;
      if (isNew) {
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        productId = data.id;
      } else {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
      }
      if (!productId) throw new Error("Produto não criado.");

      await supabase.from("product_variants").delete().eq("product_id", productId);
      const variants = sizes
        .filter((s) => s.size.trim())
        .map((s) => ({
          product_id: productId!,
          size: s.size.trim().slice(0, 12),
          stock: Math.max(0, Number(s.stock) || 0),
        }));
      if (variants.length) {
        const { error } = await supabase.from("product_variants").insert(variants);
        if (error) throw error;
      }

      await supabase.from("product_images").delete().eq("product_id", productId);
      if (images.length) {
        const { error } = await supabase.from("product_images").insert(
          images.map((img, index) => ({
            product_id: productId!,
            url: img.url,
            position: index,
          })),
        );
        if (error) throw error;
      }

      queryClient.invalidateQueries();
      toast.success("Produto salvo.");
      navigate({ to: "/admin/produtos" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="max-w-3xl space-y-8">
      <h1 className="text-2xl">{isNew ? "Novo produto" : "Editar produto"}</h1>

      <div className="grid gap-6 bg-card p-6 sm:grid-cols-2">
        <Field label="Nome">
          <input
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Preço (R$)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Categoria">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            className={inputClass}
          >
            <option value="rascunho">Rascunho</option>
            <option value="ativo">Ativo</option>
            <option value="esgotado">Esgotado</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Descrição">
            <textarea
              value={description}
              maxLength={2000}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Cores (separadas por vírgula)">
            <input
              value={colors}
              maxLength={200}
              onChange={(e) => setColors(e.target.value)}
              className={inputClass}
              placeholder="Areia, Oliva, Preto"
            />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Exibir em destaque na home
        </label>
      </div>

      <div className="bg-card p-6">
        <p className="eyebrow">Tamanhos e estoque</p>
        <div className="mt-4 space-y-3">
          {sizes.map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                value={row.size}
                maxLength={12}
                onChange={(e) =>
                  setSizes((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, size: e.target.value } : r)),
                  )
                }
                className={inputClass + " max-w-28"}
                aria-label="Tamanho"
              />
              <input
                type="number"
                min={0}
                value={row.stock}
                onChange={(e) =>
                  setSizes((prev) =>
                    prev.map((r, idx) =>
                      idx === i ? { ...r, stock: Number(e.target.value) } : r,
                    ),
                  )
                }
                className={inputClass + " max-w-32"}
                aria-label="Estoque"
              />
              <button
                type="button"
                onClick={() => setSizes((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-xs uppercase tracking-[0.2em] text-destructive"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSizes((prev) => [...prev, { size: "", stock: 0 }])}
          className="mt-4 text-xs uppercase tracking-[0.2em] underline underline-offset-4"
        >
          Adicionar tamanho
        </button>
      </div>

      <div className="bg-card p-6">
        <p className="eyebrow">Fotos</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={img.url} className="relative h-28 w-24 overflow-hidden bg-muted">
              <StoredImage reference={img.url} className="h-full w-full object-cover" alt="" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute right-0 top-0 bg-primary px-2 py-1 text-[0.6rem] text-primary-foreground"
              >
                X
              </button>
            </div>
          ))}
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={(e) => onUpload(e.target.files)}
          className="mt-4 block text-sm"
        />
        {uploading && <p className="mt-2 text-xs text-muted-foreground">Enviando…</p>}
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary px-8 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/admin/produtos" })}
          className="px-4 text-xs uppercase tracking-[0.2em] text-muted-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
