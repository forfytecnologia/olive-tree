import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { pixDiscount } from "@/lib/pricing";

/**
 * Criação do pedido no servidor.
 *
 * O navegador pode inserir pedidos, mas não pode lê-los de volta (as regras de
 * acesso liberam a leitura só para o painel). Por isso o pedido é criado aqui,
 * com os preços conferidos direto no banco — o valor nunca depende do que vem
 * da tela.
 */

const schema = z.object({
  customer: z.object({
    name: z.string().min(1).max(160),
    email: z.string().email().max(160),
    phone: z.string().min(1).max(40),
    document: z.string().max(40).default(""),
  }),
  address: z.object({
    zip: z.string().min(8).max(9),
    street: z.string().min(1).max(200),
    number: z.string().min(1).max(20),
    complement: z.string().max(120).default(""),
    district: z.string().max(120).default(""),
    city: z.string().min(1).max(120),
    state: z.string().min(2).max(2),
  }),
  shipping: z.object({
    service: z.string().max(80),
    carrier: z.string().max(80),
    days: z.number().int().min(0).max(90),
    price: z.number().min(0).max(10000),
  }),
  payment_method: z.enum(["pix", "cartao", "boleto"]),
  notes: z.string().max(1000).default(""),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        size: z.string().max(40).default(""),
        color: z.string().max(60).default(""),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(20),
});

export type CreatedOrder = {
  id: string;
  order_number: number;
  subtotal: number;
  shipping_price: number;
  total: number;
  created_at: string;
};

export const createOrderOnServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<CreatedOrder> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = [...new Set(data.items.map((i) => i.product_id))];
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id,name,slug,price,status")
      .in("id", ids);
    if (productsError) throw new Error("Não foi possível confirmar os produtos.");

    const byId = new Map(
      (products ?? []).map((p) => [
        p.id as string,
        p as unknown as { id: string; name: string; slug: string; price: number | string; status: string },
      ]),
    );

    const items = data.items.map((i) => {
      const product = byId.get(i.product_id);
      if (!product || !["ativo", "esgotado"].includes(product.status)) {
        throw new Error("Um dos itens da sacola não está mais disponível.");
      }
      return {
        product_id: product.id,
        product_name: product.name,
        product_slug: product.slug,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        unit_price: Number(product.price),
      };
    });

    const { data: images } = await supabaseAdmin
      .from("product_images")
      .select("product_id,url,position")
      .in("product_id", ids)
      .order("position", { ascending: true });
    const imageByProduct = new Map<string, string>();
    for (const img of (images ?? []) as Array<{ product_id: string; url: string }>) {
      if (!imageByProduct.has(img.product_id)) imageByProduct.set(img.product_id, img.url);
    }

    const subtotal =
      Math.round(items.reduce((s, i) => s + i.unit_price * i.quantity, 0) * 100) / 100;
    const discount = data.payment_method === "pix" ? pixDiscount(subtotal) : 0;
    const total = Math.round((subtotal - discount + data.shipping.price) * 100) / 100;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer.name,
        customer_email: data.customer.email,
        customer_phone: data.customer.phone,
        customer_document: data.customer.document,
        zip: data.address.zip,
        street: data.address.street,
        number: data.address.number,
        complement: data.address.complement,
        district: data.address.district,
        city: data.address.city,
        state: data.address.state,
        shipping_service: data.shipping.service,
        shipping_carrier: data.shipping.carrier,
        shipping_days: data.shipping.days,
        shipping_price: data.shipping.price,
        subtotal,
        total,
        payment_method: data.payment_method,
        notes: data.notes,
      })
      .select("id,order_number,subtotal,shipping_price,total,created_at")
      .single();

    if (error || !order) throw new Error("Não foi possível criar o pedido.");

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id as string,
        product_id: i.product_id,
        product_name: i.product_name,
        product_slug: i.product_slug,
        image_url: imageByProduct.get(i.product_id) ?? "",
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    );
    if (itemsError) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id as string);
      throw new Error("Não foi possível registrar os itens do pedido.");
    }

    return {
      id: order.id as string,
      order_number: Number(order.order_number),
      subtotal: Number(order.subtotal),
      shipping_price: Number(order.shipping_price),
      total: Number(order.total),
      created_at: String(order.created_at),
    };
  });
