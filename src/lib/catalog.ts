import fallbackAsset from "@/assets/brand.jpg.asset.json";
import { supabase } from "@/integrations/supabase/client";

export type ProductStatus = "ativo" | "esgotado" | "rascunho";

export type Category = {
  id: string;
  name: string;
  slug: string;
  position: number;
  active: boolean;
};

export type ProductImage = { id: string; url: string; position: number };
export type ProductVariant = { id: string; size: string; stock: number };

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  price: number;
  colors: string[];
  status: ProductStatus;
  featured: boolean;
  views: number;
  created_at: string;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
  categories: { name: string; slug: string } | null;
};

const PRODUCT_SELECT =
  "id,name,slug,description,category_id,price,colors,status,featured,views,created_at," +
  "product_images(id,url,position),product_variants(id,size,stock),categories(name,slug)";

function normalize(row: any): Product {
  return {
    ...row,
    price: Number(row.price),
    colors: row.colors ?? [],
    product_images: [...(row.product_images ?? [])].sort((a, b) => a.position - b.position),
    product_variants: [...(row.product_variants ?? [])].sort((a, b) =>
      a.size.localeCompare(b.size),
    ),
  } as Product;
}

export async function fetchCategories(includeInactive = false) {
  let query = supabase.from("categories").select("*").order("position");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function fetchProducts(opts: { includeDrafts?: boolean } = {}) {
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false });
  if (!opts.includeDrafts) query = query.in("status", ["ativo", "esgotado"]);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function fetchProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data) : null;
}

export async function fetchProductById(id: string) {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data) : null;
}

export type StoreSettings = {
  whatsapp: string;
  welcome_message: string;
  about_text: string;
  instagram_url: string;
};

export async function fetchSettings(): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from("store_settings")
    .select("whatsapp,welcome_message,about_text,instagram_url")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return (
    (data as StoreSettings) ?? {
      whatsapp: "5551992896189",
      welcome_message: "Mais do que acessórios, identidade.",
      about_text: "",
      instagram_url: "https://instagram.com/useolivetree",
    }
  );
}

export function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function stockTotal(product: Product) {
  return product.product_variants.reduce((sum, v) => sum + v.stock, 0);
}

export function coverImage(product: Product) {
  return product.product_images[0]?.url ?? fallbackAsset.url;
}

export function whatsappLink(
  phone: string,
  product: { name: string },
  size?: string | null,
  color?: string | null,
) {
  const digits = (phone || "").replace(/\D/g, "").slice(0, 15);
  const parts = [
    `Olá! Tenho interesse no óculos "${product.name.slice(0, 120)}"`,
    size ? `Tamanho: ${size.slice(0, 20)}` : null,
    color ? `Cor: ${color.slice(0, 30)}` : null,
  ].filter(Boolean);
  return `https://wa.me/${digits}?text=${encodeURIComponent(parts.join(" — "))}`;
}
