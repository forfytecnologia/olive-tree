import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { SiteLayout } from "@/components/site-chrome";
import { ProductCard } from "@/components/product-card";
import { fetchCategories, fetchProducts, formatPrice } from "@/lib/catalog";

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo — Olive Tree Acessórios" },
      {
        name: "description",
        content:
          "Navegue pelo catálogo Olive Tree por categoria, tamanho, cor e faixa de preço. Compra online com frete calculado.",
      },
      { property: "og:title", content: "Catálogo Olive Tree" },
      {
        property: "og:description",
        content: "Acessórios Olive Tree. Filtre por categoria, tamanho, cor e preço.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalogo,
});

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "border px-4 py-2 text-xs uppercase tracking-[0.15em] transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function Catalogo() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
  });

  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const sizes = useMemo(
    () =>
      Array.from(new Set(products.flatMap((p) => p.product_variants.map((v) => v.size)))).sort(),
    [products],
  );
  const colors = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.colors))).sort(),
    [products],
  );
  const priceCeiling = useMemo(
    () => Math.max(100, ...products.map((p) => p.price)),
    [products],
  );

  const filtered = products.filter((p) => {
    const t = term.trim().toLowerCase();
    if (
      t &&
      !p.name.toLowerCase().includes(t) &&
      !(p.categories?.name ?? "").toLowerCase().includes(t)
    )
      return false;
    if (category && p.categories?.slug !== category) return false;
    if (size && !p.product_variants.some((v) => v.size === size)) return false;
    if (color && !p.colors.includes(color)) return false;
    if (maxPrice != null && p.price > maxPrice) return false;
    return true;
  });

  const clear = () => {
    setTerm("");
    setCategory(null);
    setSize(null);
    setColor(null);
    setMaxPrice(null);
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-5 py-12">
        <p className="eyebrow">Coleção</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Catálogo</h1>

        <div className="mt-8 flex items-center gap-3 border-b border-border pb-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={term}
            maxLength={80}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por nome ou categoria"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-8 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Chip active={!category} onClick={() => setCategory(null)}>
              Todas
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c.id}
                active={category === c.slug}
                onClick={() => setCategory(category === c.slug ? null : c.slug)}
              >
                {c.name}
              </Chip>
            ))}
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="eyebrow mb-2">Tamanho</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <Chip key={s} active={size === s} onClick={() => setSize(size === s ? null : s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow mb-2">Cor</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <Chip key={c} active={color === c} onClick={() => setColor(color === c ? null : c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow mb-2">
                Até {formatPrice(maxPrice ?? priceCeiling)}
              </p>
              <input
                type="range"
                min={50}
                max={Math.ceil(priceCeiling)}
                step={10}
                value={maxPrice ?? Math.ceil(priceCeiling)}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label="Faixa de preço máxima"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={clear}
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground underline underline-offset-4"
          >
            Limpar filtros
          </button>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          {isLoading ? "Carregando peças…" : `${filtered.length} peça(s)`}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <p className="py-20 text-center text-muted-foreground">
            Nenhuma peça encontrada com esses filtros.
          </p>
        )}
      </div>
    </SiteLayout>
  );
}
