import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { logPaymentEvent } from "@/lib/payment-events";

/**
 * Aviso automático do Mercado Pago.
 *
 * O Mercado Pago chama este endereço quando um pagamento muda de situação.
 * Nunca confiamos no corpo da mensagem: conferimos a assinatura (quando a loja
 * cadastrou a chave secreta) e, em seguida, consultamos o pagamento na API do
 * Mercado Pago antes de mudar qualquer coisa no pedido.
 */

const MP_API = "https://api.mercadopago.com";

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function verifySignature(
  signatureHeader: string | null,
  requestId: string | null,
  dataId: string,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((piece) => {
      const [k, ...rest] = piece.split("=");
      return [(k ?? "").trim(), rest.join("=").trim()];
    }),
  ) as Record<string, string>;

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return safeEqual(v1, expected);
}

/**
 * Situação nova do pedido e de quais situações ele pode sair. Os avisos chegam
 * fora de ordem e são reenviados, então um aviso velho não pode desfazer um
 * pagamento aprovado depois.
 */
function mapStatus(status: string): { payment_status: string; from: string[] } | null {
  if (status === "approved") return { payment_status: "pago", from: ["aguardando", "cancelado", "pago"] };
  if (status === "refunded" || status === "charged_back") {
    return { payment_status: "estornado", from: ["aguardando", "pago"] };
  }
  // Cartão recusado ("rejected") não encerra o pedido: a cliente pode tentar de novo na mesma tela.
  if (status === "cancelled") return { payment_status: "cancelado", from: ["aguardando"] };
  return null;
}

export const Route = createFileRoute("/api/public/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        let payload: Record<string, unknown> = {};
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          payload = {};
        }

        const type = String(payload["type"] ?? payload["topic"] ?? url.searchParams.get("type") ?? "");
        const dataId = String(
          (payload["data"] as { id?: string | number } | undefined)?.id ??
            payload["id"] ??
            url.searchParams.get("data.id") ??
            "",
        );

        // Só tratamos avisos de pagamento; o resto é confirmado e ignorado.
        if (!dataId || !type.includes("payment")) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: settings } = await supabaseAdmin
          .from("payment_settings")
          .select("mp_access_token,mp_webhook_secret")
          .eq("id", true)
          .maybeSingle();

        const accessToken = settings?.mp_access_token ?? "";
        const secret = settings?.mp_webhook_secret ?? "";
        if (!accessToken) {
          await logPaymentEvent({
            eventType: "aviso_recebido_sem_chave",
            level: "aviso",
            message: "Chegou um aviso do Mercado Pago, mas a loja não tem a chave de acesso salva no painel.",
            payload: { aviso: payload, tipo: type, id_pagamento: dataId },
          });
          return new Response("ok");
        }

        if (secret) {
          const valid = verifySignature(
            request.headers.get("x-signature"),
            request.headers.get("x-request-id"),
            dataId,
            secret,
          );
          if (!valid) {
            await logPaymentEvent({
              eventType: "assinatura_invalida",
              level: "erro",
              message:
                "O aviso recebido não passou na conferência de segurança (assinatura diferente da esperada).",
              payload: { aviso: payload, tipo: type, id_pagamento: dataId },
            });
            return new Response("Invalid signature", { status: 401 });
          }
        }

        const res = await fetch(`${MP_API}/v1/payments/${dataId}`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.error("[mercado-pago webhook] payment lookup", res.status);
          await logPaymentEvent({
            eventType: "consulta_pagamento_falhou",
            level: "erro",
            message: `Não foi possível consultar o pagamento no Mercado Pago (código ${res.status}).`,
            payload: { id_pagamento: dataId, codigo: res.status, resposta: body.slice(0, 1500) },
          });
          return new Response("ok");
        }

        const payment = (await res.json()) as {
          id?: number | string;
          status?: string;
          status_detail?: string;
          external_reference?: string;
        };
        const orderId = payment.external_reference ?? "";
        const mapped = mapStatus(String(payment.status ?? ""));

        if (!orderId) {
          await logPaymentEvent({
            eventType: "pagamento_sem_pedido",
            level: "erro",
            message: "Um pagamento foi recebido mas não veio ligado a nenhum pedido da loja.",
            payload: payment,
          });
          return new Response("ok");
        }

        if (!mapped) {
          await logPaymentEvent({
            orderId,
            eventType: "situacao_nao_tratada",
            level: "aviso",
            message: `O pagamento está na situação "${payment.status ?? "desconhecida"}" e o pedido continua aguardando.`,
            payload: payment,
          });
          return new Response("ok");
        }

        const { data: updated, error: updateError } = await supabaseAdmin
          .from("orders")
          .update({
            payment_status: mapped.payment_status,
            payment_reference: String(payment.id ?? dataId),
            payment_provider: "mercadopago",
          })
          .eq("id", orderId)
          .in("payment_status", mapped.from)
          .select("id");

        if (!updateError && !updated?.length) {
          await logPaymentEvent({
            orderId,
            eventType: "aviso_ignorado",
            level: "aviso",
            message: `Aviso do Mercado Pago ("${payment.status}") ignorado: o pedido já está em outra situação.`,
            payload: payment,
          });
          return new Response("ok");
        }

        await logPaymentEvent({
          orderId,
          eventType: updateError ? "atualizacao_do_pedido_falhou" : "pedido_atualizado",
          level: updateError ? "erro" : mapped.payment_status === "pago" ? "info" : "aviso",
          message: updateError
            ? "O pagamento foi confirmado no Mercado Pago, mas o pedido não conseguiu mudar de situação na loja."
            : `Pedido marcado como "${mapped.payment_status}" a partir do aviso do Mercado Pago.`,
          payload: { pagamento: payment, erro: updateError?.message ?? null },
        });

        return new Response("ok");
      },
    },
  },
});
