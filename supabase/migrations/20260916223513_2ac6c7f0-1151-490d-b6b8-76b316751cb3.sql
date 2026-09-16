delete from public.orders where customer_email = 'teste@olive.com';
alter table public.orders alter column order_number restart with 1000;