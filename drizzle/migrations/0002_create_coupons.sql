CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  type text NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  min_subtotal numeric NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  max_uses_per_email integer,
  active boolean NOT NULL DEFAULT true,
  uses_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_type_chk CHECK (type IN ('percent','fixed','free_shipping'))
);
CREATE UNIQUE INDEX coupons_code_upper_idx ON public.coupons (upper(code));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER coupons_touch BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.use_coupon(_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (
    UPDATE public.coupons SET uses_count = uses_count + 1
    WHERE id = _id AND (max_uses IS NULL OR uses_count < max_uses)
    RETURNING 1
  ) SELECT EXISTS (SELECT 1 FROM u);
$$;
REVOKE EXECUTE ON FUNCTION public.use_coupon(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_coupon(uuid) TO service_role;