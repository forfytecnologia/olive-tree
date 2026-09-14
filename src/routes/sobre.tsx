import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteLayout } from "@/components/site-chrome";
import { fetchSettings } from "@/lib/catalog";
import logo from "@/assets/logo-bird.png";

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
        <img src={logo} alt="" width={72} height={72} className="mx-auto h-18 w-18" />
        <h1 className="wordmark mt-8 text-2xl">Izoton</h1>
        <p className="eyebrow mt-4">Praia chique · Urbano minimalista</p>
        <p className="mt-10 whitespace-pre-line text-left text-lg leading-relaxed text-muted-foreground">
          {settings?.about_text}
        </p>
        <p className="mt-12 text-xl">A leveza também é poder.</p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 px-5 pb-10 sm:grid-cols-3">
        {[
          ["Natural", "Linho, algodão e viscose com toque leve e caimento fluido."],
          ["Atemporal", "Peças que atravessam estações — menos coleções, mais permanência."],
          ["Minimalista", "Cortes limpos, paleta contida, nada supérfluo."],
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
