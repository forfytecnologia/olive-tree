/**
 * Regras comerciais de preço da Olive Tree.
 * Pix: 5% de desconto. Cartão: até 2x sem juros.
 */

export const PIX_DISCOUNT_RATE = 0.05;
export const MAX_INSTALLMENTS = 2;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function pixDiscount(value: number) {
  return round2(value * PIX_DISCOUNT_RATE);
}

export function pixPrice(value: number) {
  return round2(value - pixDiscount(value));
}

export function installmentValue(value: number, installments = MAX_INSTALLMENTS) {
  return round2(value / installments);
}
