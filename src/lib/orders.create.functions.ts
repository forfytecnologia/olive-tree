import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { pixDiscount } from "@/lib/pricing";

/**
 * Criação do pedido no servidor.
 *
 * O navegador pode inserir pedidos, mas não pode lê-los de volta (as regras de
 * acesso liberam a leitura só para o painel). Por isso o pedido é criado aqui,
 * com preços, estoque e frete conferidos no servidor — o valor nunca depende do
 * que vem da tela.
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
    id: z.string().max(40),
    // Valor que a cliente viu; se a cotação do servidor der outro, pedimos para recalcular.
    price: z.number().min(0).max(10000),
  }),
  payment_method: z.enum(["pix", "cartao", "boleto"]),
  notes: z.string().max(1000).default(""),
  coupon_code: z.string().max(40).default(""),
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
      .select("id,name,slug,price,status,product_variants(size,stock)")
      .in("id", ids);
    if (productsError) throw new Error("Não foi possível confirmar os produtos.");

    const byId = new Map(
      (products ?? []).map((p) => [
        p.id as string,
        p as unknown as {
          id: string;
          name: string;
          slug: string;
          price: number | string;
          status: string;
          product_variants: Array<{ size: string; stock: number }>;
        },
      ]),
    );

    // Mesmo tamanho em cores diferentes vira linhas separadas na sacola.
    const wanted = new Map<string, number>();
    for (const i of data.items) {
      const key = `${i.product_id}|${i.size}`;
      wanted.set(key, (wanted.get(key) ?? 0) + i.quantity);
    }

    const items = data.items.map((i) => {
      const product = byId.get(i.product_id);
      if (!product || product.status === "rascunho") {
        throw new Error("Um dos itens da sacola não está mais disponível.");
      }
      if (product.status !== "ativo") throw new Error(`"${product.name}" esgotou.`);
      if (product.product_variants.length) {
        const variant = product.product_variants.find((v) => v.size === i.size);
        const stock = variant?.stock ?? 0;
        if (stock <= 0) throw new Error(`"${product.name}" esgotou no tamanho ${i.size || "escolhido"}.`);
        if (stock < (wanted.get(`${i.product_id}|${i.size}`) ?? 0)) {
          throw new Error(`Só temos ${stock} unidade(s) de "${product.name}" disponíveis.`);
        }
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

    // Frete refeito aqui com a mesma regra do checkout, usando os preços do banco.
    const { shippingOptions } = await import("@/lib/shipping");
    const { liveShippingQuotes } = await import("@/lib/shipping.functions");
    const units = data.items.reduce((s, i) => s + i.quantity, 0);
    const live = await liveShippingQuotes(
      data.address.zip.replace(/\D/g, ""),
      Math.min(50, Math.max(1, units)),
      Math.min(100000, subtotal),
    );
    const shipping = shippingOptions(data.address.zip, units, subtotal, live.options).find(
      (o) => o.id === data.shipping.id,
    );
    if (!shipping || Math.abs(shipping.price - data.shipping.price) > 0.01) {
      throw new Error("O valor do frete mudou. Escolha a entrega de novo.");
    }

    let couponCode = "";
    let couponDisc = 0;
    let couponId: string | null = null;
    let shippingPrice = shipping.price;
    if (data.coupon_code.trim()) {
      const { checkCoupon } = await import("@/lib/coupons.server");
      const r = await checkCoupon(data.coupon_code, subtotal, data.customer.email);
      if (!r.ok) throw new Error(r.message);
      couponCode = r.coupon.code;
      couponDisc = r.discount;
      couponId = r.coupon.id;
      if (r.coupon.type === "free_shipping") shippingPrice = 0;
    }

    const afterCoupon = Math.round((subtotal - couponDisc) * 100) / 100;
    const discount = data.payment_method === "pix" ? pixDiscount(afterCoupon) : 0;
    const total = Math.round((afterCoupon - discount + shippingPrice) * 100) / 100;

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
        shipping_service: shipping.service,
        shipping_carrier: shipping.carrier,
        shipping_days: shipping.days,
        shipping_price: shippingPrice,
        subtotal,
        total,
        coupon_code: couponCode,
        discount_amount: couponDisc,
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

    // O uso do cupom só conta depois que o pedido existe de fato.
    if (couponId) {
      const { data: okUse } = await supabaseAdmin.rpc("use_coupon", { _id: couponId });
      if (!okUse) {
        await supabaseAdmin.from("orders").delete().eq("id", order.id as string);
        throw new Error("Este cupom acabou de atingir o limite de usos.");
      }
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
