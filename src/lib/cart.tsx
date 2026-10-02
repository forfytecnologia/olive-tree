import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type CartItem = {
  key: string;
  product_id: string;
  name: string;
  slug: string;
  image: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (item: Omit<CartItem, "key" | "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  /** Troca os preços guardados pelos atuais e tira da sacola o que saiu de venda. */
  reprice: (products: Array<{ id: string; price: number; available: boolean }>) => void;
};

const STORAGE_KEY = "olivetree.cart.v1";
const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setItems(readStorage());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback<CartContextValue["add"]>((item, quantity = 1) => {
    const key = `${item.product_id}|${item.size}|${item.color}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: Math.min(20, i.quantity + quantity) } : i,
        );
      }
      return [...prev, { ...item, key, quantity }];
    });
    setOpen(true);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(20, quantity) } : i)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const reprice = useCallback<CartContextValue["reprice"]>((products) => {
    const byId = new Map(products.map((p) => [p.id, p]));
    setItems((prev) => {
      const next = prev
        .filter((i) => byId.get(i.product_id)?.available)
        .map((i) => ({ ...i, price: byId.get(i.product_id)!.price }));
      const changed = next.length !== prev.length || next.some((i, k) => i.price !== prev[k]?.price);
      return changed ? next : prev;
    });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    return { items, count, subtotal, open, setOpen, add, setQuantity, remove, clear, reprice };
  }, [items, open, add, setQuantity, remove, clear, reprice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}
