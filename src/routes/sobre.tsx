import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteLayout } from "@/components/site-chrome";
import { fetchSettings } from "@/lib/catalog";
import logo from "@/assets/mark-wine-t.png.asset.json";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Olive Tree — Acessórios com leveza" },
      {
        name: "description",
        content:
          "A identidade da Olive Tree: leveza, natureza e atemporalidade em acessórios feitos para durar.",
      },
      { property: "og:title", content: "Sobre a Olive Tree" },
      {
        property: "og:description",
        content: "Leveza, natureza e atemporalidade em cada peça.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sobre,
});

function Sobre() {
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-5 py-20 text-center">
        <img src={logo.url} alt="" width={72} height={72} className="mx-auto h-18 w-18" />
        <h1 className="wordmark mt-8 text-2xl">Olive Tree</h1>
        <p className="eyebrow mt-4">Óculos de sol · Mais do que acessórios, identidade</p>
        <p className="mt-10 whitespace-pre-line text-left text-lg leading-relaxed text-muted-foreground">
          {settings?.about_text}
        </p>
      </section>

      <section className="border-y border-border bg-secondary/50">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <p className="eyebrow">A origem</p>
          <h2 className="mt-2 text-2xl sm:text-3xl">Por que Olive Tree?</h2>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted-foreground">
            <p>
              Porque acreditamos que uma marca deve representar muito mais do que aquilo que vende.
            </p>
            <p>
              Olive Tree significa oliveira — uma árvore conhecida por sua força, longevidade e pela
              capacidade de permanecer firme ao longo do tempo. Esses valores inspiram tudo o que
              queremos construir.
            </p>
            <p>
              Cada acessório que chega até você é escolhido com o mesmo propósito: unir elegância,
              qualidade e autenticidade, valorizando quem você é em cada detalhe.
            </p>
            <p>Mais do que acompanhar tendências, queremos fazer parte da sua história.</p>
          </div>
          <p className="mt-10 text-xl text-foreground">Seja bem-vinda à Olive Tree.</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pt-20 text-center">
        <p className="text-xl">Mais do que acessórios, identidade.</p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 px-5 pb-10 sm:grid-cols-3">
        {[
          ["Curadoria", "Cada modelo é escolhido a dedo, pensando na personalidade de quem usa."],
          ["Proteção real", "Lentes com UV400: estilo com cuidado de verdade para os seus olhos."],
          ["Perto de você", "Entrega em mãos na Grande Porto Alegre e envio para todo o Brasil."],
        ].map(([title, text]) => (
          <div key={title}>
            <h2 className="text-lg">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}
