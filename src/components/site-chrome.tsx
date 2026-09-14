import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Instagram, Menu, Search, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import brandLogo from "@/assets/logo-izoton-bird.png";
import logo from "@/assets/logo-bird.png";
import { fetchSettings } from "@/lib/catalog";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/sobre", label: "Sobre" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="surface-olive sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-3" aria-label="IZOTON — página inicial">
          <img src={brandLogo} alt="" width={44} height={44} className="h-11 w-11 object-contain" />
          <span className="wordmark text-lg">Izoton</span>
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

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="surface-olive border-t border-primary-foreground/20 px-5 py-4 md:hidden">
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

export function SiteFooter() {
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  return (
    <footer className="surface-olive mt-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:grid-cols-3">
        <div>
          <img src={logo} alt="" width={40} height={40} className="mb-4 h-10 w-10" loading="lazy" />
          <p className="wordmark text-sm">Izoton</p>
          <p className="mt-3 max-w-xs text-sm opacity-70">
            Praia chique. Urbano minimalista. A leveza também é poder.
          </p>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-4 opacity-70">Navegue</p>
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="block py-1 opacity-80 hover:opacity-100">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-4 opacity-70">Contato</p>
          <a
            href={settings?.instagram_url ?? "https://instagram.com/izotonoficial"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 opacity-80 hover:opacity-100"
          >
            <Instagram className="h-4 w-4" /> @izotonoficial
          </a>
          {settings?.whatsapp && (
            <a
              href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block opacity-80 hover:opacity-100"
            >
              WhatsApp de vendas
            </a>
          )}
          <Link to="/auth" className="mt-6 block text-xs opacity-50 hover:opacity-90">
            Área administrativa
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 pb-12">
        <div className="inline-flex items-center">
          <img
            src="/images/google-safe-browsing.png"
            alt="Google Safe Browsing — site 100% seguro"
            width={1376}
            height={768}
            className="h-16 w-auto"
            loading="lazy"
          />
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
    </div>
  );
}
