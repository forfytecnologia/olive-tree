import markAsset from "@/assets/mark-wine-t.png.asset.json";

type Testimonial = {
  quote: string;
  extra?: string;
  author: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Oi Fe, eu ameiiii demais!!! O óculos é lindooo, qualidade IMPECÁVEL, fora toda a composição que amei também. Adorei minha compra!",
    extra: "Parabéns pelo bom gosto, pelo capricho.",
    author: "Cliente Olive Tree",
  },
  {
    quote:
      "Chegou rapidinho e veio tudo certinho, com case e flanela. Uso todos os dias, combina com tudo.",
    author: "Cliente de Porto Alegre",
  },
  {
    quote:
      "Provei virtualmente antes de comprar e acertei em cheio no modelo. Atendimento super atencioso.",
    author: "Cliente Olive Tree",
  },
];

function Stars() {
  return (
    <div className="mt-6 flex justify-center gap-2 text-lg text-primary/70" aria-label="5 de 5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden>
          ✦
        </span>
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="border-y border-border bg-background">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="text-center">
          <p className="eyebrow">Prova social</p>
          <h2 className="mt-2 text-2xl sm:text-3xl">O que elas dizem</h2>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.quote} className="relative flex flex-col pt-10">
              <span className="absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background">
                <img src={markAsset.url} alt="" aria-hidden width={40} height={40} className="h-8 w-8 object-contain" />
              </span>
              <blockquote className="surface-sage flex h-full flex-col justify-center rounded-md px-6 pb-8 pt-12 text-center">
                <p className="text-sm leading-relaxed text-primary">{t.quote}</p>
                {t.extra && <p className="mt-4 text-sm leading-relaxed text-primary">{t.extra}</p>}
                <Stars />
              </blockquote>
              <figcaption className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {t.author}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
