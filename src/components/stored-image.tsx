import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

/** Resolves an image reference that is either a public path/URL or a storage path. */
export function useStoredImageUrl(reference: string | undefined) {
  const isDirect = !reference || reference.startsWith("http") || reference.startsWith("/");
  const [url, setUrl] = useState<string | undefined>(
    isDirect ? reference : cache.get(reference!),
  );

  useEffect(() => {
    let cancelled = false;
    if (!reference) return;
    if (reference.startsWith("http") || reference.startsWith("/")) {
      setUrl(reference);
      return;
    }
    const cached = cache.get(reference);
    if (cached) {
      setUrl(cached);
      return;
    }
    supabase.storage
      .from("product-images")
      .createSignedUrl(reference, 60 * 60)
      .then(({ data }) => {
        if (cancelled || !data?.signedUrl) return;
        cache.set(reference, data.signedUrl);
        setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return url;
}

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & { reference: string };

export function StoredImage({ reference, alt = "", ...rest }: Props) {
  const url = useStoredImageUrl(reference);
  if (!url) return <span className="block h-full w-full bg-muted" aria-hidden />;
  return <img src={url} alt={alt} {...rest} />;
}
