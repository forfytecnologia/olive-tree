import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AppliedCoupon } from "./coupons";

const schema = z.object({
  code: z.string().max(40),
  email: z.string().max(160).default(""),
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(20),
});

export type CouponResult =
  | { ok: true; coupon: AppliedCoupon; discount: number }
  | { ok: false; message: string };

/** Confere o cupom na loja. Subtotal é calculado com os preços do banco. */
export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }): Promise<CouponResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { checkCoupon } = await import("./coupons.server");
    const ids = [...new Set(data.items.map((i) => i.product_id))];
    const { data: products } = await supabaseAdmin.from("products").select("id,price").in("id", ids);
    const price = new Map((products ?? []).map((p) => [p.id as string, Number(p.price)]));
    const subtotal = data.items.reduce((s, i) => s + (price.get(i.product_id) ?? 0) * i.quantity, 0);
    const r = await checkCoupon(data.code, Math.round(subtotal * 100) / 100, data.email);
    if (!r.ok) return r;
    return { ok: true, coupon: { code: r.coupon.code, type: r.coupon.type, value: r.coupon.value }, discount: r.discount };
  });
