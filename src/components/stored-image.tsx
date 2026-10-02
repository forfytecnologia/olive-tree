import { supabase } from "@/integrations/supabase/client";

/** Resolves an image reference that is either a public path/URL or a storage path. */
export function useStoredImageUrl(reference: string | undefined) {
  if (!reference || reference.startsWith("http") || reference.startsWith("/")) return reference;
  // The bucket is public: the plain URL never expires (signed URLs died after 1h in open tabs).
  return supabase.storage.from("product-images").getPublicUrl(reference).data.publicUrl;
}

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & { reference: string };

export function StoredImage({ reference, alt = "", ...rest }: Props) {
  const url = useStoredImageUrl(reference);
  if (!url) return <span className="block h-full w-full bg-muted" aria-hidden />;
  return <img src={url} alt={alt} {...rest} />;
}
