import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/lib/cart";
import type { ShippingOption } from "@/lib/shipping";
import type { PaymentMethod } from "@/lib/payments";
import { pixDiscount } from "@/lib/pricing";

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
  const subtotal = input.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = input.payment_method === "pix" ? pixDiscount(subtotal) : 0;
  const total = subtotal - discount + input.shipping.price;

  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_name: input.customer.name,
      customer_email: input.customer.email,
      customer_phone: input.customer.phone,
      customer_document: input.customer.document,
      zip: input.address.zip,
      street: input.address.street,
      number: input.address.number,
      complement: input.address.complement,
      district: input.address.district,
      city: input.address.city,
      state: input.address.state,
      shipping_service: input.shipping.service,
      shipping_carrier: input.shipping.carrier,
      shipping_days: input.shipping.days,
      shipping_price: input.shipping.price,
      subtotal,
      total,
      payment_method: input.payment_method,
      notes: input.notes ?? "",
    })
    .select("id,order_number,total,subtotal,shipping_price,created_at")
    .single();

  if (error) throw error;

  const { error: itemsError } = await supabase.from("order_items").insert(
    input.items.map((i) => ({
      order_id: (data as { id: string }).id,
      product_id: i.product_id,
      product_name: i.name,
      product_slug: i.slug,
      image_url: i.image,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      unit_price: i.price,
    })),
  );
  if (itemsError) throw itemsError;

  return numeric(data as Record<string, unknown>);
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
