alter table public.payment_settings
  add column if not exists provider text not null default 'mercadopago',
  add column if not exists infinitepay_handle text not null default '';