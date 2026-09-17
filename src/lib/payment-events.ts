/**
 * Registro de acontecimentos de pagamento.
 *
 * Toda vez que algo importante acontece no pagamento (aviso recebido do
 * gateway, link criado, erro na comunicação, assinatura inválida...) guardamos
 * uma linha aqui. É a partir desse histórico que o painel explica, em
 * linguagem simples, o que deu errado.
 */

export type PaymentEventLevel = "info" | "aviso" | "erro";

export type PaymentEventInput = {
  orderId?: string | null;
  provider?: string;
  eventType: string;
  level?: PaymentEventLevel;
  message?: string;
  payload?: unknown;
};

/** Remove dados sensíveis antes de guardar o conteúdo recebido do gateway. */
function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[...]";
  if (Array.isArray(value)) return value.slice(0, 40).map((v) => sanitize(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (/token|secret|password|authorization|api[_-]?key/i.test(key)) {
        out[key] = "[oculto]";
        continue;
      }
      out[key] = sanitize(raw, depth + 1);
    }
    return out;
  }
  if (typeof value === "string") return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  return value;
}

export async function logPaymentEvent(input: PaymentEventInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payment_events").insert({
      order_id: input.orderId ?? null,
      provider: input.provider ?? "mercadopago",
      event_type: input.eventType,
      level: input.level ?? "info",
      message: input.message ?? "",
      payload: (sanitize(input.payload ?? {}) ?? {}) as never,
    });
  } catch (err) {
    // Nunca deixamos o registro atrapalhar o pagamento em si.
    console.error("[payment-events] falha ao registrar", err);
  }
}
