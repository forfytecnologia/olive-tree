/** Regras de cupom compartilhadas entre a tela, o servidor e o painel. */

export type CouponType = "percent" | "fixed" | "free_shipping";

export type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_subtotal: number;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  max_uses_per_email: number | null;
  active: boolean;
  uses_count: number;
  created_at: string;
};

export type AppliedCoupon = { code: string; type: CouponType; value: number };

export const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  percent: "Porcentagem",
  fixed: "Valor fixo",
  free_shipping: "Frete grátis",
};

export function normalizeCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Valor descontado dos produtos (frete grátis não desconta produtos). */
export function couponDiscount(subtotal: number, c: AppliedCoupon | null) {
  if (!c) return 0;
  if (c.type === "percent") return round2(Math.min(subtotal, subtotal * (Math.min(100, c.value) / 100)));
  if (c.type === "fixed") return round2(Math.min(subtotal, c.value));
  return 0;
}

export type CouponStatus = "ativo" | "pausado" | "agendado" | "expirado" | "esgotado";

export function couponStatus(c: Coupon, now = new Date()): CouponStatus {
  if (!c.active) return "pausado";
  if (c.ends_at && new Date(c.ends_at) < now) return "expirado";
  if (c.max_uses != null && c.uses_count >= c.max_uses) return "esgotado";
  if (c.starts_at && new Date(c.starts_at) > now) return "agendado";
  return "ativo";
}

export function describeCoupon(c: Pick<Coupon, "type" | "value">) {
  if (c.type === "percent") return `${c.value}% de desconto`;
  if (c.type === "fixed")
    return `${c.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de desconto`;
  return "Frete grátis";
}
