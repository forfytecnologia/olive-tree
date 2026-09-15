import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Instagram, Menu, Minus, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import markCream from "@/assets/mark-cream-t.png.asset.json";
import wordmarkCream from "@/assets/wordmark-cream.png.asset.json";
import { StoredImage } from "@/components/stored-image";
import { useCart } from "@/lib/cart";
import { fetchSettings, formatPrice } from "@/lib/catalog";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/provador", label: "Provador virtual" },
  { to: "/sobre", label: "Sobre" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { count, setOpen: setCartOpen } = useCart();

  return (
    <header className="surface-wine sticky top-0 z-40">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2" aria-label="Olive Tree — página inicial">
          <img
            src={wordmarkCream.url}
            alt="Olive Tree Acessórios"
            width={280}
            height={87}
            className="h-11 w-auto object-contain sm:h-14"
          />
          <img
            src={markCream.url}
            alt=""
            width={40}
            height={40}
            className="h-8 w-8 object-contain sm:h-9 sm:w-9"
          />
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm opacity-70 transition-opacity hover:opacity-100"
              activeProps={{ className: "opacity-100" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/catalogo"
            className="opacity-70 transition-opacity hover:opacity-100"
            aria-label="Buscar peças"
          >
            <Search className="h-4 w-4" />
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative opacity-80 transition-opacity hover:opacity-100"
            aria-label={`Abrir sacola (${count} itens)`}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="surface-sage absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem]">
                {count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="surface-wine border-t border-sand/20 px-5 py-4 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm tracking-wide"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function CartDrawer() {
  const { items, open, setOpen, subtotal, setQuantity, remove } = useCart();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar sacola"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-foreground/40"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <p className="eyebrow">Sua sacola</p>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar sacola">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Sua sacola está vazia.
            </p>
          )}
          {items.map((item) => (
            <div key={item.key} className="flex gap-4 border-b border-border/60 py-5">
              <StoredImage
                reference={item.image}
                alt={item.name}
                className="h-24 w-20 flex-none object-cover"
              />
              <div className="flex-1">
                <p className="text-sm">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[item.size, item.color].filter(Boolean).join(" · ") || "Tamanho único"}
                </p>
                <p className="mt-1 text-sm">{formatPrice(item.price * item.quantity)}</p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.key, item.quantity - 1)}
                    aria-label="Diminuir quantidade"
                    className="border border-border p-1"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.key, item.quantity + 1)}
                    aria-label="Aumentar quantidade"
                    className="border border-border p-1"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.key)}
                    aria-label="Remover item"
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-5 py-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Frete calculado no checkout.</p>
          <Link
            to="/checkout"
            onClick={() => setOpen(false)}
            aria-disabled={items.length === 0}
            className={
              "mt-5 block bg-primary py-4 text-center text-xs uppercase tracking-[0.25em] text-primary-foreground " +
              (items.length === 0 ? "pointer-events-none opacity-40" : "hover:opacity-90")
            }
          >
            Finalizar compra
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full text-center text-xs uppercase tracking-[0.2em] text-muted-foreground"
          >
            Continuar comprando
          </button>
        </div>
      </aside>
    </div>
  );
}

export function SiteFooter() {
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const instagram = settings?.instagram_url || "https://instagram.com/olivetreeacessorios";

  return (
    <footer className="surface-wine mt-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:grid-cols-3">
        <div>
          <img
            src={wordmarkCream.url}
            alt="Olive Tree Acessórios"
            width={220}
            height={68}
            loading="lazy"
            className="h-10 w-auto object-contain"
          />
          <p className="mt-4 max-w-xs text-sm opacity-70">
            Acessórios feitos para durar. Delicadeza, natureza e presença.
          </p>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-4 text-sand opacity-70">Navegue</p>
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="block py-1 opacity-80 hover:opacity-100">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-4 text-sand opacity-70">Contato</p>
          <a
            href={instagram}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 opacity-80 hover:opacity-100"
          >
            <Instagram className="h-4 w-4" /> Instagram
          </a>
          {settings?.whatsapp && (
            <a
              href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block opacity-80 hover:opacity-100"
            >
              WhatsApp para dúvidas
            </a>
          )}
          <Link to="/auth" className="mt-6 block text-xs opacity-50 hover:opacity-90">
            Área administrativa
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CartDrawer />
    </div>
  );
}
