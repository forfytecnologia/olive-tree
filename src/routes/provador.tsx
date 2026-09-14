import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site-chrome";

const PROVADOR_URL = "https://provoulevou.com.br/catalogo/?loja=olivetree";

export const Route = createFileRoute("/provador")({
  head: () => ({
    meta: [
      { title: "Provador virtual — Olive Tree Acessórios" },
      {
        name: "description",
        content:
          "Experimente os acessórios Olive Tree no provador virtual antes de comprar, direto pelo celular.",
      },
      { property: "og:title", content: "Provador virtual Olive Tree" },
      {
        property: "og:description",
        content: "Veja como cada peça fica em você antes de finalizar a compra.",
      },
    ],
  }),
  component: ProvadorPage,
});

function ProvadorPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-5 pt-12">
        <p className="eyebrow">Experimente antes</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Provador virtual</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Escolha uma peça e veja como ela fica em você. Se o provador não abrir aqui,{" "}
          <a
            href={PROVADOR_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            abra em uma nova aba
          </a>
          .
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-5 pb-12">
        <div className="overflow-hidden border border-border bg-card">
          <iframe
            src={PROVADOR_URL}
            title="Provador virtual Olive Tree"
            className="h-[75vh] min-h-[520px] w-full"
            allow="camera; clipboard-write; fullscreen"
            loading="lazy"
          />
        </div>
      </section>
    </SiteLayout>
  );
}
