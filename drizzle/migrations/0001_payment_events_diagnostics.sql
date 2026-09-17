create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  provider text not null default 'mercadopago',
  event_type text not null,
  level text not null default 'info',
  message text not null default '',
  payload jsonb not null default '{}'::jsonb,
  ai_explanation text,
  ai_explained_at timestamptz,
  created_at timestamptz not null default now()
);

grant select on public.payment_events to authenticated;
grant all on public.payment_events to service_role;

alter table public.payment_events enable row level security;

drop policy if exists "Admins leem eventos de pagamento" on public.payment_events;
create policy "Admins leem eventos de pagamento"
on public.payment_events
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create index if not exists payment_events_created_at_idx on public.payment_events (created_at desc);
create index if not exists payment_events_order_idx on public.payment_events (order_id);