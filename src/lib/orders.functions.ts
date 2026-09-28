import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Leitura pública de um pedido pelo seu id (uuid funciona como token secreto
 * entregue à cliente no fim do checkout). Retorna apenas campos não sensíveis.
 */
const idSchema = z.object({ id: z.string().uuid() });

export type OrderView = {
  id: string;
  order_number: number;
  customer_email: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  shipping_carrier: string;
  shipping_service: string;
  shipping_days: number;
  shipping_price: number;
  subtotal: number;
  total: number;
  coupon_code: string;
  discount_amount: number;
  payment_method: string;
  payment_status: string;
  payment_link: string;
  fulfillment_status: string;
  tracking_code: string;
  created_at: string;
  order_items: Array<{
    id: string;
    product_name: string;
    product_slug: string;
    image_url: string;
    size: string;
    color: string;
    quantity: number;
    unit_price: number;
  }>;
};

export const getPublicOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id,order_number,customer_email,zip,street,number,complement,district,city,state," +
          "shipping_carrier,shipping_service,shipping_days,shipping_price,subtotal,total,coupon_code,discount_amount," +
          "payment_method,payment_status,payment_link,fulfillment_status,tracking_code,created_at," +
          "order_items(id,product_name,product_slug,image_url,size,color,quantity,unit_price)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar o pedido.");
    if (!row) return null;
    const order = row as unknown as Record<string, unknown> & {
      order_items?: Array<Record<string, unknown> & { unit_price: number | string }>;
    };
    return {
      ...order,
      shipping_price: Number(order["shipping_price"] ?? 0),
      subtotal: Number(order["subtotal"] ?? 0),
      total: Number(order["total"] ?? 0),
      discount_amount: Number(order["discount_amount"] ?? 0),
      order_items: (order.order_items ?? []).map((i) => ({
        ...i,
        unit_price: Number(i.unit_price),
      })),
    } as OrderView;
  });

/** Confirmação de pagamento simulada — substituir pelo webhook do gateway. */
export const confirmMockPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.extend({ reference: z.string().max(64) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: "pago", payment_reference: data.reference })
      .eq("id", data.id)
      .eq("payment_status", "aguardando");
    if (error) throw new Error("Não foi possível confirmar o pagamento.");
    return { ok: true };
  });
