import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Leitura pública de um pedido pelo seu id (uuid funciona como token secreto
 * entregue à cliente no fim do checkout). Retorna apenas campos não sensíveis.
 */
const idSchema = z.object({ id: z.string().uuid() });

export const getPublicOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id,order_number,customer_email,zip,street,number,complement,district,city,state," +
          "shipping_carrier,shipping_service,shipping_days,shipping_price,subtotal,total," +
          "payment_method,payment_status,fulfillment_status,tracking_code,created_at," +
          "order_items(id,product_name,product_slug,image_url,size,color,quantity,unit_price)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar o pedido.");
    if (!row) return null;
    return {
      ...row,
      shipping_price: Number(row.shipping_price),
      subtotal: Number(row.subtotal),
      total: Number(row.total),
      order_items: (row.order_items ?? []).map((i) => ({ ...i, unit_price: Number(i.unit_price) })),
    };
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
