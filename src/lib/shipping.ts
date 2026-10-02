/**
 * Adaptador de frete.
 *
 * 1) Melhor Envio (preço real) quando a loja tem token salvo no painel.
 * 2) Estimativa local como reserva, para a loja nunca ficar sem frete.
 */
import { quoteShippingLive } from "./shipping.functions";


export type ShippingItem = { quantity: number; price: number };

export type ShippingOption = {
  id: string;
  carrier: string;
  service: string;
  price: number;
  days: number;
};

export const FREE_SHIPPING_FROM = 350;

export function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

export function isValidCep(cep: string) {
  return onlyDigits(cep).length === 8;
}

export type CepAddress = {
  zip: string;
  street: string;
  district: string;
  city: string;
  state: string;
};

export async function lookupCep(cep: string): Promise<CepAddress | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, string> & { erro?: boolean };
    if (data.erro) return null;
    return {
      zip: digits,
      street: data["logradouro"] ?? "",
      district: data["bairro"] ?? "",
      city: data["localidade"] ?? "",
      state: data["uf"] ?? "",
    };
  } catch {
    return null;
  }
}

/** Distância simulada a partir da primeira faixa do CEP. */
function regionFactor(cep: string) {
  const prefix = Number(onlyDigits(cep).slice(0, 1) || "0");
  // 0–1 Sudeste (origem) · 2–3 Sudeste/Sul · 4–5 Nordeste · 6–7 Norte/Centro · 8–9 Sul
  if (prefix <= 1) return 1;
  if (prefix <= 3) return 1.25;
  if (prefix <= 5) return 1.75;
  if (prefix <= 7) return 2;
  return 1.5;
}

function applyFreeShipping(options: ShippingOption[], merchandise: number) {
  if (merchandise >= FREE_SHIPPING_FROM && options.length) {
    const cheapest = options.reduce((a, b) => (a.price <= b.price ? a : b));
    cheapest.price = 0;
    cheapest.service = `${cheapest.service} (frete grátis)`;
  }
  return options.sort((a, b) => a.price - b.price);
}

export async function quoteShipping(
  cep: string,
  items: ShippingItem[],
): Promise<ShippingOption[]> {
  if (!isValidCep(cep)) return [];
  const units = items.reduce((s, i) => s + i.quantity, 0) || 1;
  const merchandise = items.reduce((s, i) => s + i.price * i.quantity, 0);

  // 1) Melhor Envio (quando a loja tiver token configurado no painel)
  let live: ShippingOption[] = [];
  try {
    const res = await quoteShippingLive({
      data: {
        zip: onlyDigits(cep),
        units: Math.min(50, Math.max(1, units)),
        merchandise: Math.min(100000, Math.round(merchandise * 100) / 100),
      },
    });
    live = res.options;
  } catch {
    // segue para a estimativa local
  }
  return shippingOptions(cep, units, merchandise, live);
}

/**
 * Opções de entrega a partir da cotação do Melhor Envio (ou da estimativa local
 * quando ela vem vazia). O servidor usa esta mesma regra para conferir o frete
 * escolhido no pedido.
 */
export function shippingOptions(
  cep: string,
  units: number,
  merchandise: number,
  live: ShippingOption[],
): ShippingOption[] {
  if (live.length) {
    return applyFreeShipping(
      live.slice(0, 6).map((o) => ({ ...o })),
      merchandise,
    );
  }

  // 2) Estimativa local (usada enquanto a integração estiver desligada)
  const factor = regionFactor(cep);
  const weight = 0.12 * units; // kg estimado por acessório

  const round = (v: number) => Math.round(v * 100) / 100;

  const base: ShippingOption[] = [
    {
      id: "mini",
      carrier: "Correios",
      service: "Mini Envios",
      price: round((9.9 + weight * 6) * factor),
      days: Math.round(6 * factor),
    },
    {
      id: "pac",
      carrier: "Correios",
      service: "PAC",
      price: round((17.5 + weight * 9) * factor),
      days: Math.round(5 * factor),
    },
    {
      id: "sedex",
      carrier: "Correios",
      service: "SEDEX",
      price: round((28.9 + weight * 14) * factor),
      days: Math.max(1, Math.round(2 * factor)),
    },
    {
      id: "jadlog",
      carrier: "Jadlog",
      service: ".Package",
      price: round((21.4 + weight * 11) * factor),
      days: Math.round(4 * factor),
    },
  ];

  return applyFreeShipping(base, merchandise);
}
