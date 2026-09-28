import { couponDiscount, couponStatus, normalizeCode, type AppliedCoupon, type Coupon } from "./coupons";

export type CouponCheck =
  | { ok: true; coupon: AppliedCoupon & { id: string }; discount: number }
  | { ok: false; message: string };

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function checkCoupon(rawCode: string, subtotal: number, email: string): Promise<CouponCheck> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, message: "Digite o código do cupom." };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("coupons").select("*").ilike("code", code).maybeSingle();
  if (!data) return { ok: false, message: "Cupom não encontrado. Confira se digitou certo." };
  const c = { ...data, value: Number(data.value), min_subtotal: Number(data.min_subtotal) } as Coupon;
  const status = couponStatus(c);
  if (status === "pausado") return { ok: false, message: "Este cupom não está disponível no momento." };
  if (status === "expirado") return { ok: false, message: "Este cupom expirou." };
  if (status === "esgotado") return { ok: false, message: "Este cupom já atingiu o limite de usos." };
  if (status === "agendado") return { ok: false, message: "Este cupom ainda não está valendo." };
  if (subtotal < c.min_subtotal)
    return { ok: false, message: `Este cupom vale para compras a partir de ${brl(c.min_subtotal)}.` };
  const mail = email.trim().toLowerCase();
  if (c.max_uses_per_email != null && mail) {
    const { count } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .ilike("coupon_code", c.code)
      .ilike("customer_email", mail)
      .neq("payment_status", "cancelado");
    if ((count ?? 0) >= c.max_uses_per_email)
      return { ok: false, message: "Você já usou este cupom o número máximo de vezes." };
  }
  const coupon = { id: c.id, code: c.code, type: c.type, value: c.value };
  return { ok: true, coupon, discount: couponDiscount(subtotal, coupon) };
}
