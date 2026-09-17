import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Integração Mercado Pago (Checkout Pro).
 *
 * As chaves ficam na tabela `payment_settings` (só admin escreve) e nunca são
 * enviadas ao navegador: todas as chamadas à API acontecem aqui no servidor.
 */

const MP_API = "https://api.mercadopago.com";
const IP_API = "https://api.infinitepay.io";

export type PaymentProvider = "mercadopago" | "infinitepay";

export type PaymentConfigView = {
  provider: PaymentProvider;
  hasToken: boolean;
  tokenPreview: string;
  publicKey: string;
  hasWebhookSecret: boolean;
  infinitepayHandle: string;
  sandbox: boolean;
  enabled: boolean;
  webhookUrl: string;
};

type PaymentSettings = {
  provider: string;
  mp_access_token: string;
  mp_public_key: string;
  mp_webhook_secret: string;
  infinitepay_handle: string;
  sandbox: boolean;
  enabled: boolean;
};

async function loadPaymentSettings(): Promise<PaymentSettings | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_settings")
    .select(
      "provider,mp_access_token,mp_public_key,mp_webhook_secret,infinitepay_handle,sandbox,enabled",
    )
    .eq("id", true)
    .maybeSingle();
  return (data as PaymentSettings | null) ?? null;
}


/** Domínio oficial da loja — usado no aviso automático e no retorno do pagamento. */
const OFFICIAL_SITE_URL = "https://www.useolivetree.com.br";

function siteOrigin(): string {
  const configured = process.env["PUBLIC_SITE_URL"];
  if (configured) return configured.replace(/\/+$/, "");
  try {
    const url = getRequestUrl({ xForwardedHost: true, xForwardedProto: true });
    const host = url.host;
    // Endereços de prévia da Lovable não servem para o Mercado Pago.
    if (/lovableproject\.com$|lovable\.app$|^localhost(:\d+)?$/.test(host)) {
      return OFFICIAL_SITE_URL;
    }
    return `${url.protocol}//${host}`;
  } catch {
    return OFFICIAL_SITE_URL;
  }
}


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

/**
 * Cria (ou recria) o link de pagamento do gateway escolhido pela loja
 * (Mercado Pago ou InfinitePay). Devolve `url: null` quando a integração está
 * desligada ou falha — nesse caso o site continua no modo simulado.
 */
export const createGatewayCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<{ url: string | null; error: string | null }> => {
    const settings = await loadPaymentSettings();
    const provider = (settings?.provider ?? "mercadopago") as PaymentProvider;
    if (!settings || !settings.enabled) return { url: null, error: null };
    if (provider === "mercadopago" && !settings.mp_access_token) return { url: null, error: null };
    if (provider === "infinitepay" && !settings.infinitepay_handle) {
      return { url: null, error: null };
    }


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("orders")
      .select(
        "id,order_number,customer_name,customer_email,customer_phone,subtotal,total," +
          "shipping_price,payment_status,payment_link," +
          "order_items(product_name,quantity,unit_price)",
      )
      .eq("id", data.orderId)
      .maybeSingle();

    const order = row as unknown as
      | {
          id: string;
          order_number: number;
          customer_name: string;
          customer_email: string;
          subtotal: number | string;
          total: number | string;
          shipping_price: number | string;
          payment_status: string;
          payment_link: string | null;
          order_items?: Array<{
            product_name: string;
            quantity: number;
            unit_price: number | string;
          }>;
        }
      | null;

    if (!order) return { url: null, error: "Pedido não encontrado." };
    if (order.payment_status === "pago") return { url: null, error: null };
    if (order.payment_link) return { url: order.payment_link, error: null };

    const items = (order.order_items ?? []) as Array<{
      product_name: string;
      quantity: number;
      unit_price: number | string;
    }>;

    const subtotal = Number(order.subtotal ?? 0);
    const shippingPrice = Number(order.shipping_price ?? 0);
    const total = Number(order.total ?? 0);
    // O total já considera o desconto do Pix; repassamos a diferença como
    // desconto proporcional para o Mercado Pago cobrar exatamente esse valor.
    const discount = Math.max(0, Math.round((subtotal + shippingPrice - total) * 100) / 100);

    const origin = siteOrigin();

    if (provider === "infinitepay") {
      const handle = settings.infinitepay_handle.replace(/^\$/, "").trim();
      const body = {
        handle,
        order_nsu: order.id,
        redirect_url: `${origin}/pedido/${order.id}`,
        customer: {
          name: order.customer_name,
          email: order.customer_email,
          phone_number: (order as { customer_phone?: string }).customer_phone ?? "",
        },
        items: [
          {
            quantity: 1,
            price: Math.round(total * 100),
            description: `Pedido nº ${order.order_number} — Olive Tree`,
          },
        ],
      };

      try {
        const res = await fetch(`${IP_API}/invoices/public/checkout/links`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("[infinitepay] link", res.status, text.slice(0, 400));
          return { url: null, error: "Pagamento online indisponível no momento." };
        }
        const json = (await res.json()) as { url?: string };
        if (!json.url) return { url: null, error: "Pagamento online indisponível no momento." };

        await supabaseAdmin
          .from("orders")
          .update({ payment_provider: "infinitepay", payment_link: json.url })
          .eq("id", order.id);

        return { url: json.url, error: null };
      } catch (err) {
        console.error("[infinitepay]", err);
        return { url: null, error: "Pagamento online indisponível no momento." };
      }
    }


    const preference: Record<string, unknown> = {
      external_reference: order.id,
      statement_descriptor: "OLIVETREE",
      items: items.map((i) => ({
        title: i.product_name.slice(0, 250),
        quantity: Math.max(1, Number(i.quantity)),
        unit_price: Math.round(Number(i.unit_price) * 100) / 100,
        currency_id: "BRL",
      })),
      payer: {
        name: order.customer_name,
        email: order.customer_email,
      },
      shipments: { cost: shippingPrice, mode: "not_specified" },
      payment_methods: {
        installments: 2,
        default_installments: 1,
      },
      metadata: { order_number: order.order_number },
    };

    if (discount > 0) {
      (preference["items"] as Array<Record<string, unknown>>).push({
        title: "Desconto Pix (5%)",
        quantity: 1,
        unit_price: -discount,
        currency_id: "BRL",
      });
    }

    if (origin) {
      preference["back_urls"] = {
        success: `${origin}/pedido/${order.id}?status=sucesso`,
        pending: `${origin}/pedido/${order.id}?status=pendente`,
        failure: `${origin}/pedido/${order.id}?status=falhou`,
      };
      preference["auto_return"] = "approved";
      preference["notification_url"] = `${origin}/api/public/mercadopago/webhook`;
    }

    try {
      const res = await fetch(`${MP_API}/checkout/preferences`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.mp_access_token}`,
        },
        body: JSON.stringify(preference),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[mercado-pago] preference", res.status, text.slice(0, 400));
        return { url: null, error: "Pagamento online indisponível no momento." };
      }

      const pref = (await res.json()) as { init_point?: string; sandbox_init_point?: string };
      const url = settings.sandbox
        ? (pref.sandbox_init_point ?? pref.init_point)
        : (pref.init_point ?? pref.sandbox_init_point);
      if (!url) return { url: null, error: "Pagamento online indisponível no momento." };

      await supabaseAdmin
        .from("orders")
        .update({ payment_provider: "mercadopago", payment_link: url })
        .eq("id", order.id);

      return { url, error: null };
    } catch (err) {
      console.error("[mercado-pago]", err);
      return { url: null, error: "Pagamento online indisponível no momento." };
    }
  });

export const getPaymentConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaymentConfigView> => {
    await assertAdmin(context as never);
    const s = await loadPaymentSettings();
    const token = s?.mp_access_token ?? "";
    const origin = siteOrigin();
    return {
      provider: ((s?.provider ?? "mercadopago") as PaymentProvider),
      hasToken: token.length > 0,
      tokenPreview: token ? `••••••••${token.slice(-6)}` : "",
      publicKey: s?.mp_public_key ?? "",
      hasWebhookSecret: (s?.mp_webhook_secret ?? "").length > 0,
      infinitepayHandle: s?.infinitepay_handle ?? "",
      sandbox: s?.sandbox ?? false,
      enabled: s?.enabled ?? false,
      webhookUrl: origin ? `${origin}/api/public/mercadopago/webhook` : "",
    };
  });

const configSchema = z.object({
  provider: z.enum(["mercadopago", "infinitepay"]),
  access_token: z.string().max(4000).optional(),
  public_key: z.string().max(400),
  webhook_secret: z.string().max(400).optional(),
  infinitepay_handle: z.string().max(120),
  sandbox: z.boolean(),
  enabled: z.boolean(),
});


export const savePaymentConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => configSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = {
      mp_public_key: data.public_key.trim(),
      sandbox: data.sandbox,
      enabled: data.enabled,
      ...((data.access_token ?? "").trim()
        ? { mp_access_token: (data.access_token ?? "").trim() }
        : {}),
      ...((data.webhook_secret ?? "").trim()
        ? { mp_webhook_secret: (data.webhook_secret ?? "").trim() }
        : {}),
    };
    const { error } = await supabaseAdmin
      .from("payment_settings")
      .update(patch)
      .eq("id", true);
    if (error) throw new Error("Não foi possível salvar a configuração de pagamento.");
    return { ok: true };
  });

export const testPaymentConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; message: string }> => {
    await assertAdmin(context as never);
    const settings = await loadPaymentSettings();
    if (!settings || !settings.mp_access_token) {
      return { ok: false, message: "Salve a chave de acesso do Mercado Pago primeiro." };
    }
    try {
      const res = await fetch(`${MP_API}/users/me`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${settings.mp_access_token}`,
        },
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: "Chave inválida ou sem permissão. Copie de novo no Mercado Pago." };
      }
      if (!res.ok) {
        return { ok: false, message: `O Mercado Pago respondeu com erro ${res.status}.` };
      }
      const me = (await res.json()) as { nickname?: string; email?: string; site_id?: string };
      if (me.site_id && me.site_id !== "MLB") {
        return {
          ok: false,
          message: "Essa conta não é do Mercado Pago Brasil. Use a conta brasileira da loja.",
        };
      }
      return {
        ok: true,
        message: `Conexão funcionando. Conta: ${me.nickname ?? me.email ?? "Mercado Pago"}.`,
      };
    } catch {
      return { ok: false, message: "Não foi possível falar com o Mercado Pago agora." };
    }
  });
