/**
 * Adaptador de pagamento.
 *
 * Hoje: simulação local (mock).
 * Depois: trocar a implementação de `createPayment` por uma chamada ao
 * Mercado Pago (server function), mantendo exatamente esta assinatura.
 */

export type PaymentMethod = "pix" | "cartao" | "boleto";

export type PaymentIntent = {
  reference: string;
  method: PaymentMethod;
  status: "aguardando";
  pix_key?: string;
  pix_code?: string;
  boleto_line?: string;
  expires_in_minutes?: number;
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  cartao: "Cartão de crédito",
  boleto: "Boleto bancário",
};

function randomRef() {
  return `SIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function createPayment(input: {
  method: PaymentMethod;
  total: number;
  orderId: string;
}): Promise<PaymentIntent> {
  await new Promise((r) => setTimeout(r, 500));
  const reference = randomRef();

  if (input.method === "pix") {
    return {
      reference,
      method: "pix",
      status: "aguardando",
      pix_key: "contato@olivetree.com.br",
      pix_code: `00020126580014BR.GOV.BCB.PIX0136${input.orderId.slice(0, 36)}5204000053039865802BR6009SAO PAULO62070503***6304SIM`,
      expires_in_minutes: 30,
    };
  }

  if (input.method === "boleto") {
    return {
      reference,
      method: "boleto",
      status: "aguardando",
      boleto_line: "34191.79001 01043.510047 91020.150008 5 00000000000000",
      expires_in_minutes: 4320,
    };
  }

  return { reference, method: "cartao", status: "aguardando" };
}
