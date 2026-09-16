CREATE TABLE IF NOT EXISTS public.shipping_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  melhor_envio_token text NOT NULL DEFAULT '',
  sandbox boolean NOT NULL DEFAULT false,
  origin_zip text NOT NULL DEFAULT '94931130',
  box_length numeric NOT NULL DEFAULT 20,
  box_width numeric NOT NULL DEFAULT 12,
  box_height numeric NOT NULL DEFAULT 8,
  box_weight numeric NOT NULL DEFAULT 0.35,
  insurance_enabled boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.shipping_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON public.shipping_settings TO authenticated;
GRANT ALL ON public.shipping_settings TO service_role;

ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage shipping settings" ON public.shipping_settings;
CREATE POLICY "Admins manage shipping settings"
ON public.shipping_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS touch_shipping_settings ON public.shipping_settings;
CREATE TRIGGER touch_shipping_settings BEFORE UPDATE ON public.shipping_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();