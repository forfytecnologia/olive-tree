import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteLayout } from "@/components/site-chrome";
import { ProductCard } from "@/components/product-card";
import { fetchProducts, fetchSettings } from "@/lib/catalog";
import heroAsset from "@/assets/hero.jpg.asset.json";
import brandAsset from "@/assets/brand.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Olive Tree Acessórios — Loja online" },
      {
        name: "description",
        content:
          "Acessórios Olive Tree com compra online, provador virtual e entrega para todo o Brasil.",
      },
      { property: "og:title", content: "Olive Tree Acessórios" },
      {
        property: "og:description",
        content: "Compre online, prove virtualmente e receba em casa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => fetchProducts() });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const featured = (products ?? []).filter((p) => p.featured).slice(0, 4);
  const latest = (products ?? []).slice(0, 8);

  return (
    <SiteLayout>
      <section className="relative">
        <img
          src={heroAsset.url}
          alt="Mulher usando óculos de sol Olive Tree sob luz natural"
          width={1920}
          height={1088}
          fetchPriority="high"
          className="aspect-[4/5] w-full object-cover object-right sm:aspect-[16/10] lg:aspect-[16/7]"
        />
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-primary/70 via-primary/10 to-transparent sm:bg-gradient-to-r sm:from-primary/60 sm:via-primary/10 sm:to-transparent">
          <div className="mx-auto w-full max-w-6xl px-5 pb-14">
            <p className="wordmark text-sm text-primary-foreground">Olive Tree</p>
            <h1 className="mt-4 max-w-xl text-3xl leading-tight text-primary-foreground sm:text-5xl">
              {settings?.welcome_message ?? "Mais do que acessórios, identidade."}
            </h1>
            <Link
              to="/catalogo"
              className="mt-8 inline-block border border-primary-foreground/70 px-8 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground transition-colors hover:bg-primary-foreground hover:text-primary"
            >
              Ver catálogo
            </Link>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-20">
          <p className="eyebrow">Destaques</p>
          <h2 className="mt-2 text-2xl sm:text-3xl">Seleção da estação</h2>
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="border-y border-border bg-secondary/60">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <p className="eyebrow">A marca</p>
          <p className="mt-4 text-xl leading-relaxed sm:text-2xl">
            Mais do que acessórios, identidade. Óculos escolhidos a dedo para você.
          </p>
          <Link
            to="/sobre"
            className="mt-8 inline-block text-xs uppercase tracking-[0.25em] underline underline-offset-8"
          >
            Conheça a Olive Tree
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="eyebrow">Novidades</p>
        <h2 className="mt-2 text-2xl sm:text-3xl">Últimas peças</h2>
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
          {latest.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
