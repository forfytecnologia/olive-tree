import fallbackAsset from "@/assets/brand.jpg.asset.json";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site-chrome";
import { StoredImage } from "@/components/stored-image";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { fetchProductBySlug, fetchSettings, formatPrice, whatsappLink } from "@/lib/catalog";

export const Route = createFileRoute("/produto/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Olive Tree Acessórios` },
      {
        name: "description",
        content:
          "Detalhes da peça Olive Tree: fotos, tamanhos, cores, frete calculado e compra online.",
      },
      { property: "og:title", content: "Peça Olive Tree" },
      {
        property: "og:description",
        content: "Veja fotos, tamanhos e cores. Compre online com entrega para todo o Brasil.",
      },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProdutoPage,
});

const DETAILS = [
  ["Proteção", "Lentes com proteção UV400 contra raios UVA e UVB."],
  ["Acompanha", "Case, flanela de limpeza e certificado de garantia."],
  ["Entrega", "Enviamos para todo o Brasil. Entrega em mãos na Grande Porto Alegre."],
  ["Troca", "Até 7 dias após o recebimento, sem uso e na embalagem original."],
];

function ProdutoPage() {
  const { slug } = Route.useParams();
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug),
  });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { add } = useCart();

  const [active, setActive] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase.rpc("increment_product_views", { _slug: slug });
  }, [slug]);

  if (isLoading) {
    return (
      <SiteLayout>
        <p className="mx-auto max-w-6xl px-5 py-24 text-muted-foreground">Carregando peça…</p>
      </SiteLayout>
    );
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-6xl px-5 py-24 text-center">
          <h1 className="text-2xl">Peça não encontrada</h1>
          <Link to="/catalogo" className="mt-6 inline-block text-sm underline underline-offset-4">
            Voltar ao catálogo
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const images = product.product_images.length
    ? product.product_images
    : [{ id: "fallback", url: fallbackAsset.url, position: 0 }];
  const available = product.product_variants.filter((v) => v.stock > 0);
  const soldOut = product.status === "esgotado" || available.length === 0;

  function handleAddToCart() {
    if (!product) return;
    if (product.product_variants.length > 0 && !size) {
      toast.error("Escolha um tamanho.");
      return;
    }
    if (product.colors.length > 0 && !color) {
      toast.error("Escolha uma cor.");
      return;
    }
    add({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      image: images[0]?.url ?? "",
      size: size ?? "",
      color: color ?? "",
      price: product.price,
    });
    toast.success("Adicionado à sacola.");
  }


  return (
    <SiteLayout>
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-12 lg:grid-cols-2">
        <div>
          <button
            type="button"
            onClick={() => setZoom((v) => !v)}
            className="block w-full cursor-zoom-in overflow-hidden bg-muted"
            aria-label="Ampliar foto"
          >
            <StoredImage
              reference={images[active]?.url ?? fallbackAsset.url}
              alt={product.name}
              width={900}
              height={1200}
              className={
                "aspect-[3/4] w-full object-cover transition-transform duration-500 " +
                (zoom ? "scale-150" : "scale-100")
              }
            />
          </button>
          {images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActive(i)}
                  className={
                    "h-20 w-16 overflow-hidden border " +
                    (i === active ? "border-primary" : "border-transparent")
                  }
                >
                  <StoredImage
                    reference={img.url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.categories?.name && <p className="eyebrow">{product.categories.name}</p>}
          <h1 className="mt-2 text-3xl">{product.name}</h1>
          <p className="mt-3 text-xl">{formatPrice(product.price)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatPrice(pixPrice(product.price))} no Pix (5% de desconto) · ou{" "}
            {MAX_INSTALLMENTS}x de {formatPrice(installmentValue(product.price))} sem juros
          </p>
          {product.description && (
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {product.colors.length > 0 && (
            <div className="mt-8">
              <p className="eyebrow mb-3">Cor</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c === color ? null : c)}
                    className={
                      "border px-4 py-2 text-xs uppercase tracking-[0.15em] " +
                      (color === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground")
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.product_variants.length > 0 && (
            <div className="mt-8">
              <p className="eyebrow mb-3">Tamanho</p>
              <div className="flex flex-wrap gap-2">
                {product.product_variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={v.stock <= 0}
                    onClick={() => setSize(v.size === size ? null : v.size)}
                    className={
                      "border px-4 py-2 text-xs uppercase tracking-[0.15em] disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through " +
                      (size === v.size
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground")
                    }
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={soldOut}
            onClick={handleAddToCart}
            className="mt-10 block w-full bg-primary py-4 text-center text-xs uppercase tracking-[0.25em] text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {soldOut ? "Esgotado" : "Adicionar à sacola"}
          </button>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              to="/provador"
              className="border border-border py-3 text-center text-xs uppercase tracking-[0.2em]"
            >
              Provador virtual
            </Link>
            <a
              href={whatsappLink(settings?.whatsapp ?? "", product, size, color)}
              target="_blank"
              rel="noreferrer"
              className="border border-border py-3 text-center text-xs uppercase tracking-[0.2em]"
            >
              Tirar dúvidas
            </a>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Entrega para todo o Brasil · frete grátis acima de R$ 350
          </p>

          <dl className="mt-12 space-y-4">
            {DETAILS.map(([title, text]) => (
              <div key={title} className="border-b border-border/60 pb-4">
                <dt className="text-sm">{title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </SiteLayout>
  );
}
