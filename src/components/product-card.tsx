import { Link } from "@tanstack/react-router";

import { StoredImage } from "@/components/stored-image";
import { coverImage, formatPrice, type Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to="/produto/$slug"
      params={{ slug: product.slug }}
      className="group block"
      aria-label={product.name}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <StoredImage
          reference={coverImage(product)}
          alt={product.name}
          loading="lazy"
          width={900}
          height={1200}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        {product.status === "esgotado" && (
          <span className="absolute left-0 top-4 bg-primary px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-primary-foreground">
            Esgotado
          </span>
        )}
      </div>
      <div className="pt-4">
        {product.categories?.name && <p className="eyebrow">{product.categories.name}</p>}
        <h3 className="mt-1 text-base font-normal">{product.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}
