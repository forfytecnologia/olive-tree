import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Diagnóstico de pagamentos para o painel.
 *
 * Lista o histórico de acontecimentos e usa a inteligência artificial da
 * Lovable para explicar, em português simples, o que aconteceu e o que a
 * equipe deve fazer.
 */

export type PaymentEventView = {
  id: string;
  created_at: string;
  provider: string;
  event_type: string;
  level: string;
  message: string;
  payload: unknown;
  order_id: string | null;
  order_number: number | null;
  order_status: string | null;
  customer_name: string | null;
  total: number | null;
  ai_explanation: string | null;
};

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const { data } = await supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Acesso restrito.");
}

export const listPaymentEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ onlyProblems: z.boolean().optional(), limit: z.number().min(1).max(100).optional() })
      .optional()
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<PaymentEventView[]> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("payment_events")
      .select(
        "id,created_at,provider,event_type,level,message,payload,order_id,ai_explanation," +
          "orders(order_number,payment_status,customer_name,total)",
      )
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 40);

    if (data?.onlyProblems) query = query.in("level", ["erro", "aviso"]);

    const { data: rows, error } = await query;
    if (error) throw new Error("Não foi possível carregar o histórico de pagamentos.");

    return ((rows ?? []) as unknown as Array<Record<string, unknown>>).map((r) => {
      const order = (r["orders"] ?? null) as {
        order_number?: number;
        payment_status?: string;
        customer_name?: string;
        total?: number | string;
      } | null;
      return {
        id: String(r["id"]),
        created_at: String(r["created_at"]),
        provider: String(r["provider"] ?? ""),
        event_type: String(r["event_type"] ?? ""),
        level: String(r["level"] ?? "info"),
        message: String(r["message"] ?? ""),
        payload: r["payload"] ?? {},
        order_id: (r["order_id"] as string | null) ?? null,
        order_number: order?.order_number ?? null,
        order_status: order?.payment_status ?? null,
        customer_name: order?.customer_name ?? null,
        total: order?.total != null ? Number(order.total) : null,
        ai_explanation: (r["ai_explanation"] as string | null) ?? null,
      };
    });
  });

const SYSTEM_PROMPT = `Você é o assistente de suporte da loja virtual Olive Tree (óculos de sol).
Explique falhas e inconsistências de pagamento para uma equipe que NÃO entende de programação.
Regras:
- Escreva em português do Brasil, simples e direto, sem jargão técnico (nada de "API", "webhook", "HTTP 401", "JSON", "token").
- Use no máximo 120 palavras.
- Estrutura: uma frase dizendo o que aconteceu; uma frase dizendo o impacto para a cliente que comprou; depois "O que fazer:" com 1 a 3 passos curtos e concretos.
- Se o pagamento provavelmente foi aprovado mas o pedido não mudou de situação, avise para conferir no aplicativo do gateway antes de marcar como pago.
- Nunca invente valores, nomes ou números que não estejam nos dados.`;

async function askGateway(prompt: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("A explicação automática não está configurada.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions: SYSTEM_PROMPT,
      input: prompt,
      stream: true,
      reasoning: { effort: "low", summary: "auto" },
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    console.error("[ai] explicação de pagamento", res.status, body.slice(0, 400));
    if (res.status === 429 || res.status >= 500) {
      throw new Error("O serviço de explicação está ocupado. Tente de novo em instantes.");
    }
    if (res.status === 402) {
      throw new Error("Os créditos de inteligência artificial acabaram. Recarregue para continuar.");
    }
    if (res.status === 403) {
      throw new Error("A explicação automática está bloqueada nas configurações da conta.");
    }
    throw new Error("Não foi possível gerar a explicação agora.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const evt = JSON.parse(raw) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed" && !text && evt.response?.output_text) {
          text = evt.response.output_text;
        }
      } catch {
        // linha parcial ou evento desconhecido — seguimos adiante
      }
    }
  }

  return text.trim();
}

export const explainPaymentEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ eventId: z.string().uuid(), refresh: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ explanation: string }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("payment_events")
      .select(
        "id,created_at,provider,event_type,level,message,payload,order_id,ai_explanation," +
          "orders(order_number,payment_status,fulfillment_status,customer_name,total,payment_method,payment_reference)",
      )
      .eq("id", data.eventId)
      .maybeSingle();

    if (!row) throw new Error("Acontecimento não encontrado.");
    const event = row as unknown as Record<string, unknown>;

    const cached = event["ai_explanation"] as string | null;
    if (cached && !data.refresh) return { explanation: cached };

    // Eventos recentes do mesmo pedido dão contexto à explicação.
    const orderId = (event["order_id"] as string | null) ?? null;
    let history: Array<Record<string, unknown>> = [];
    if (orderId) {
      const { data: rows } = await supabaseAdmin
        .from("payment_events")
        .select("created_at,event_type,level,message")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true })
        .limit(20);
      history = (rows ?? []) as unknown as Array<Record<string, unknown>>;
    }

    const prompt = [
      "Dados do acontecimento de pagamento:",
      JSON.stringify(
        {
          quando: event["created_at"],
          gateway: event["provider"],
          tipo: event["event_type"],
          gravidade: event["level"],
          mensagem: event["message"],
          conteudo_recebido: event["payload"],
          pedido: event["orders"] ?? null,
        },
        null,
        2,
      ).slice(0, 12000),
      "",
      "Histórico do mesmo pedido (mais antigo primeiro):",
      JSON.stringify(history, null, 2).slice(0, 6000),
      "",
      "Explique para a equipe da loja.",
    ].join("\n");

    const explanation = await askGateway(prompt);
    if (!explanation) throw new Error("A explicação voltou vazia. Tente de novo.");

    await supabaseAdmin
      .from("payment_events")
      .update({ ai_explanation: explanation, ai_explained_at: new Date().toISOString() })
      .eq("id", data.eventId);

    return { explanation };
  });
