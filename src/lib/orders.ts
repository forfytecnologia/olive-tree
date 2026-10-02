import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/lib/cart";
import type { ShippingOption } from "@/lib/shipping";
import type { PaymentMethod } from "@/lib/payments";
import { createOrderOnServer } from "@/lib/orders.create.functions";

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string;
  image_url: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
};

export type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_document: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  shipping_service: string;
  shipping_carrier: string;
  shipping_days: number;
  shipping_price: number;
  subtotal: number;
  total: number;
  payment_method: string;
  payment_status: string;
  payment_reference: string;
  fulfillment_status: string;
  tracking_code: string;
  notes: string;
  coupon_code?: string;
  discount_amount?: number;
  created_at: string;
  order_items?: OrderItem[];
};

export type CheckoutInput = {
  customer: { name: string; email: string; phone: string; document: string };
  address: {
    zip: string;
    street: string;
    number: string;
    complement: string;
    district: string;
    city: string;
    state: string;
  };
  shipping: ShippingOption;
  payment_method: PaymentMethod;
  items: CartItem[];
  notes?: string;
  coupon_code?: string;
};

function numeric(row: Record<string, unknown>) {
  return {
    ...row,
    shipping_price: Number(row["shipping_price"] ?? 0),
    subtotal: Number(row["subtotal"] ?? 0),
    total: Number(row["total"] ?? 0),
  } as Order;
}

export async function createOrder(input: CheckoutInput): Promise<Order> {
  // O pedido é criado no servidor: lá os preços são conferidos no banco e o
  // pedido pode ser lido de volta (o navegador não tem essa permissão).
  const created = await createOrderOnServer({
    data: {
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        document: input.customer.document ?? "",
      },
      address: {
        zip: input.address.zip,
        street: input.address.street,
        number: input.address.number,
        complement: input.address.complement ?? "",
        district: input.address.district ?? "",
        city: input.address.city,
        state: input.address.state,
      },
      shipping: { id: input.shipping.id, price: input.shipping.price },
      payment_method: input.payment_method,
      notes: input.notes ?? "",
      coupon_code: input.coupon_code ?? "",
      items: input.items.map((i) => ({
        product_id: i.product_id,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
      })),
    },
  });

  return created as unknown as Order;
}

export async function markOrderPaid(orderId: string, reference: string) {
  const { error } = await supabase
    .from("orders")
    .update({ payment_status: "pago", payment_reference: reference })
    .eq("id", orderId);
  if (error) throw error;
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => numeric(r as Record<string, unknown>));
}

export async function fetchOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*,order_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const order = numeric(data as Record<string, unknown>);
  order.order_items = ((data as { order_items?: OrderItem[] }).order_items ?? []).map((i) => ({
    ...i,
    unit_price: Number(i.unit_price),
  }));
  return order;
}

export async function updateOrder(
  id: string,
  patch: Partial<Pick<Order, "payment_status" | "fulfillment_status" | "tracking_code" | "notes">>,
) {
  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) throw error;
}

export const PAYMENT_STATUS = ["aguardando", "pago", "cancelado", "estornado"] as const;
export const FULFILLMENT_STATUS = ["preparando", "enviado", "entregue", "cancelado"] as const;
