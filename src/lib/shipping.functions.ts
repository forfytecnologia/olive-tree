import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Integração Melhor Envio.
 * O token fica na tabela `shipping_settings` (só admin escreve) e nunca é
 * enviado ao navegador: todas as chamadas à API acontecem aqui no servidor.
 */

export type LiveQuote = {
  id: string;
  carrier: string;
  service: string;
  price: number;
  days: number;
};

export type ShippingConfigView = {
  hasToken: boolean;
  tokenPreview: string;
  sandbox: boolean;
  origin_zip: string;
  box_length: number;
  box_width: number;
  box_height: number;
  box_weight: number;
  insurance_enabled: boolean;
  enabled: boolean;
};

type SettingsRow = {
  melhor_envio_token: string;
  sandbox: boolean;
  origin_zip: string;
  box_length: number;
  box_width: number;
  box_height: number;
  box_weight: number;
  insurance_enabled: boolean;
  enabled: boolean;
};

const digits = (v: string) => (v || "").replace(/\D/g, "");

async function loadSettings(): Promise<SettingsRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("shipping_settings")
    .select(
      "melhor_envio_token,sandbox,origin_zip,box_length,box_width,box_height,box_weight,insurance_enabled,enabled",
    )
    .eq("id", true)
    .maybeSingle();
  return (data as SettingsRow | null) ?? null;
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

/** Chama o Melhor Envio e devolve as opções normalizadas. */
async function callMelhorEnvio(
  settings: SettingsRow,
  toZip: string,
  units: number,
  merchandise: number,
): Promise<LiveQuote[]> {
  const base = settings.sandbox
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";

  const body = {
    from: { postal_code: digits(settings.origin_zip) },
    to: { postal_code: digits(toZip) },
    package: {
      height: Number(settings.box_height),
      width: Number(settings.box_width),
      length: Number(settings.box_length),
      weight: Number(settings.box_weight) * Math.max(1, units),
    },
    options: {
      insurance_value: settings.insurance_enabled ? Number(merchandise.toFixed(2)) : 0,
      receipt: false,
      own_hand: false,
    },
  };

  const res = await fetch(`${base}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.melhor_envio_token}`,
      "User-Agent": "Olive Tree (contato@olivetree.com.br)",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      res.status === 401 || res.status === 403
        ? "Token do Melhor Envio inválido ou sem permissão de cálculo de frete."
        : `Melhor Envio respondeu ${res.status}: ${text.slice(0, 200)}`,
    );
  }

  const list = (await res.json()) as Array<{
    id: number;
    name: string;
    price?: string | number;
    custom_price?: string | number;
    delivery_time?: number;
    custom_delivery_time?: number;
    company?: { name?: string };
    error?: string;
  }>;

  if (!Array.isArray(list)) throw new Error("Resposta inesperada do Melhor Envio.");

  return list
    .filter((s) => !s.error && s.price != null)
    .map((s) => ({
      id: `me-${s.id}`,
      carrier: s.company?.name ?? "Melhor Envio",
      service: s.name,
      price: Math.round(Number(s.custom_price ?? s.price) * 100) / 100,
      days: Number(s.custom_delivery_time ?? s.delivery_time ?? 0),
    }))
    .filter((s) => Number.isFinite(s.price) && s.price > 0)
    .sort((a, b) => a.price - b.price);
}

/** Cotação usada pelo checkout. Devolve [] quando a integração está desligada. */
export const quoteShippingLive = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        zip: z.string().min(8).max(12),
        units: z.number().int().min(1).max(50),
        merchandise: z.number().min(0).max(100000),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ options: LiveQuote[]; error: string | null }> => {
    const settings = await loadSettings();
    if (!settings || !settings.enabled || !settings.melhor_envio_token) {
      return { options: [], error: null };
    }
    try {
      const options = await callMelhorEnvio(settings, data.zip, data.units, data.merchandise);
      return { options, error: null };
    } catch (err) {
      console.error("[melhor-envio]", err);
      return { options: [], error: "Cálculo automático indisponível." };
    }
  });

export const getShippingConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ShippingConfigView> => {
    await assertAdmin(context as never);
    const s = await loadSettings();
    const token = s?.melhor_envio_token ?? "";
    return {
      hasToken: token.length > 0,
      tokenPreview: token ? `••••••••${token.slice(-6)}` : "",
      sandbox: s?.sandbox ?? false,
      origin_zip: s?.origin_zip ?? "",
      box_length: Number(s?.box_length ?? 20),
      box_width: Number(s?.box_width ?? 12),
      box_height: Number(s?.box_height ?? 8),
      box_weight: Number(s?.box_weight ?? 0.35),
      insurance_enabled: s?.insurance_enabled ?? true,
      enabled: s?.enabled ?? false,
    };
  });

const configSchema = z.object({
  token: z.string().max(4000).optional(),
  sandbox: z.boolean(),
  origin_zip: z.string().min(8).max(12),
  box_length: z.number().min(1).max(200),
  box_width: z.number().min(1).max(200),
  box_height: z.number().min(1).max(200),
  box_weight: z.number().min(0.01).max(30),
  insurance_enabled: z.boolean(),
  enabled: z.boolean(),
});

export const saveShippingConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => configSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = {
      sandbox: data.sandbox,
      origin_zip: digits(data.origin_zip),
      box_length: data.box_length,
      box_width: data.box_width,
      box_height: data.box_height,
      box_weight: data.box_weight,
      insurance_enabled: data.insurance_enabled,
      enabled: data.enabled,
    };
    const token = (data.token ?? "").trim();
    if (token) patch["melhor_envio_token"] = token;

    const { error } = await supabaseAdmin
      .from("shipping_settings")
      .update(patch)
      .eq("id", true);
    if (error) throw new Error("Não foi possível salvar a configuração de envio.");
    return { ok: true };
  });

export const testShippingConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ zip: z.string().min(8).max(12) }).parse(data))
  .handler(async ({ data, context }): Promise<{ options: LiveQuote[]; error: string | null }> => {
    await assertAdmin(context as never);
    const settings = await loadSettings();
    if (!settings || !settings.melhor_envio_token) {
      return { options: [], error: "Salve o token do Melhor Envio primeiro." };
    }
    try {
      const options = await callMelhorEnvio(settings, data.zip, 1, 189.9);
      if (!options.length) return { options: [], error: "Nenhuma transportadora atende este CEP." };
      return { options, error: null };
    } catch (err) {
      return { options: [], error: err instanceof Error ? err.message : "Falha no teste." };
    }
  });
