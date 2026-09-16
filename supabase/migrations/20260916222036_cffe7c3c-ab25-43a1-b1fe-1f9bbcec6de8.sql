create table if not exists public.payment_settings (
  id boolean primary key default true,
  mp_access_token text not null default '',
  mp_public_key text not null default '',
  mp_webhook_secret text not null default '',
  sandbox boolean not null default false,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint payment_settings_single_row check (id)
);

grant select, insert, update on public.payment_settings to authenticated;
grant all on public.payment_settings to service_role;

alter table public.payment_settings enable row level security;

create policy "Admins manage payment settings"
on public.payment_settings for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create trigger touch_payment_settings
before update on public.payment_settings
for each row execute function public.touch_updated_at();

insert into public.payment_settings (id) values (true) on conflict do nothing;

alter table public.orders add column if not exists payment_provider text not null default '';
alter table public.orders add column if not exists payment_link text not null default '';