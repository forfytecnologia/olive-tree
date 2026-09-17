import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import {
  explainPaymentEvent,
  listPaymentEvents,
  type PaymentEventView,
} from "@/lib/payment-diagnostics.functions";
import { formatPrice } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/diagnostico")({
  component: DiagnosticoAdmin,
  head: () => ({
    meta: [
      { title: "Diagnóstico de pagamentos · Painel Olive Tree" },
      {
        name: "description",
        content:
          "Histórico de pagamentos da Olive Tree com explicações automáticas em linguagem simples.",
      },
    ],
  }),
});

const LEVEL_STYLE: Record<string, string> = {
  erro: "bg-primary text-primary-foreground",
  aviso: "bg-secondary text-secondary-foreground",
  info: "bg-muted text-muted-foreground",
};

const LEVEL_LABEL: Record<string, string> = {
  erro: "Problema",
  aviso: "Atenção",
  info: "Tudo certo",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function DiagnosticoAdmin() {
  const load = useServerFn(listPaymentEvents);
  const explain = useServerFn(explainPaymentEvent);

  const [onlyProblems, setOnlyProblems] = useState(true);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openPayload, setOpenPayload] = useState<string | null>(null);

  const { data, isLoading } = useQuery<PaymentEventView[]>({
    queryKey: ["payment-events", onlyProblems],
    queryFn: () => load({ data: { onlyProblems } }),
  });

  async function onExplain(event: PaymentEventView, refresh = false) {
    setLoadingId(event.id);
    try {
      const res = await explain({ data: { eventId: event.id, refresh } });
      setExplanations((prev) => ({ ...prev, [event.id]: res.explanation }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar a explicação.");
    } finally {
      setLoadingId(null);
    }
  }

  const events = data ?? [];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-2xl">Diagnóstico de pagamentos</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Aqui aparece tudo o que aconteceu nos pagamentos da loja: avisos recebidos, telas de
          pagamento criadas e qualquer falha pelo caminho. Clique em <strong>Explicar</strong> para
          que o assistente conte, em palavras simples, o que houve e o que fazer.
        </p>
      </header>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={onlyProblems}
          onChange={(e) => setOnlyProblems(e.target.checked)}
        />
        Mostrar só problemas e avisos
      </label>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando histórico…</p>
      ) : events.length === 0 ? (
        <div className="bg-card p-10 text-sm text-muted-foreground">
          Nenhum acontecimento registrado {onlyProblems ? "com problema " : ""}até agora. Isso é um
          bom sinal: nada falhou nos pagamentos.
        </div>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => {
            const explanation = explanations[event.id] ?? event.ai_explanation;
            return (
              <li key={event.id} className="bg-card p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`px-3 py-1 text-xs uppercase tracking-[0.15em] ${
                      LEVEL_STYLE[event.level] ?? LEVEL_STYLE["info"]
                    }`}
                  >
                    {LEVEL_LABEL[event.level] ?? "Informação"}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                  <span className="text-xs text-muted-foreground">
                    {event.provider === "infinitepay" ? "InfinitePay" : "Mercado Pago"}
                  </span>
                  {event.order_id ? (
                    <Link
                      to="/admin/pedidos/$id"
                      params={{ id: event.order_id }}
                      className="text-xs underline underline-offset-4"
                    >
                      Pedido nº {event.order_number ?? "—"}
                      {event.customer_name ? ` · ${event.customer_name}` : ""}
                      {event.total != null ? ` · ${formatPrice(event.total)}` : ""}
                    </Link>
                  ) : null}
                </div>

                <p className="mt-3 text-sm">{event.message}</p>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onExplain(event, !!explanation)}
                    disabled={loadingId === event.id}
                    className="bg-primary px-5 py-2 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60"
                  >
                    {loadingId === event.id
                      ? "Analisando…"
                      : explanation
                        ? "Explicar de novo"
                        : "Explicar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenPayload(openPayload === event.id ? null : event.id)}
                    className="text-xs underline underline-offset-4 text-muted-foreground"
                  >
                    {openPayload === event.id ? "Esconder detalhes" : "Ver detalhes técnicos"}
                  </button>
                </div>

                {explanation ? (
                  <div className="mt-4 whitespace-pre-line bg-secondary/40 p-5 text-sm leading-relaxed">
                    {explanation}
                  </div>
                ) : null}

                {openPayload === event.id ? (
                  <pre className="mt-4 max-h-80 overflow-auto bg-muted p-4 text-xs text-muted-foreground">
                    {event.payload}
                  </pre>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
