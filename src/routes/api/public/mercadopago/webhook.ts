import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

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

function mapStatus(status: string): { payment_status: string } | null {
  if (status === "approved") return { payment_status: "pago" };
  if (status === "refunded" || status === "charged_back") return { payment_status: "estornado" };
  if (status === "cancelled" || status === "rejected") return { payment_status: "cancelado" };
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
        if (!accessToken) return new Response("ok");

        if (secret) {
          const valid = verifySignature(
            request.headers.get("x-signature"),
            request.headers.get("x-request-id"),
            dataId,
            secret,
          );
          if (!valid) return new Response("Invalid signature", { status: 401 });
        }

        const res = await fetch(`${MP_API}/v1/payments/${dataId}`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          console.error("[mercado-pago webhook] payment lookup", res.status);
          return new Response("ok");
        }

        const payment = (await res.json()) as {
          id?: number | string;
          status?: string;
          external_reference?: string;
        };
        const orderId = payment.external_reference ?? "";
        const mapped = mapStatus(String(payment.status ?? ""));
        if (!orderId || !mapped) return new Response("ok");

        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: mapped.payment_status,
            payment_reference: String(payment.id ?? dataId),
            payment_provider: "mercadopago",
          })
          .eq("id", orderId);

        return new Response("ok");
      },
    },
  },
});
