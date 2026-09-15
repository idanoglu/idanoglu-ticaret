create extension if not exists pgcrypto;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text, role text not null default 'sales', created_at timestamptz default now()
);
create table if not exists public.products(
 id uuid primary key default gen_random_uuid(), name text not null, code text, category text,
 stock numeric not null default 0, purchase_price numeric(12,2) not null default 0,
 sale_price_vat_included numeric(12,2) not null default 0, vat_rate numeric(5,2) not null default 20,
 min_stock numeric not null default 0, description text, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.customers(
 id uuid primary key default gen_random_uuid(), name text not null, contact text, phone text, address text,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.orders(
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id),
 order_date timestamptz not null default now(), note text default '', status text not null default 'completed',
 total_vat_included numeric(12,2) not null default 0, total_vat numeric(12,2) not null default 0,
 total_net numeric(12,2) not null default 0, created_by uuid references auth.users(id), created_at timestamptz default now()
);
create table if not exists public.order_items(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid references public.products(id), product_name_snapshot text not null,
 qty numeric not null, unit_price_vat_included numeric(12,2) not null,
 purchase_price_snapshot numeric(12,2) not null, vat_rate_snapshot numeric(5,2) not null,
 line_total numeric(12,2) not null
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "auth profiles" on public.profiles for select to authenticated using (true);
create policy "auth products" on public.products for all to authenticated using (true) with check (true);
create policy "auth customers" on public.customers for all to authenticated using (true) with check (true);
create policy "auth orders" on public.orders for select to authenticated using (true);
create policy "auth items" on public.order_items for select to authenticated using (true);

create or replace function public.create_order(p_customer_id uuid,p_note text,p_items jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare oid uuid; x jsonb; p products%rowtype; q numeric; up numeric; vr numeric; total numeric:=0; tv numeric:=0;
begin
 insert into orders(customer_id,note,created_by) values(p_customer_id,coalesce(p_note,''),auth.uid()) returning id into oid;
 for x in select * from jsonb_array_elements(p_items) loop
   select * into p from products where id=(x->>'product_id')::uuid for update;
   if not found then raise exception 'Ürün bulunamadı'; end if;
   q=(x->>'qty')::numeric; if q<=0 then raise exception 'Miktar geçersiz'; end if;
   if p.stock<q then raise exception 'Yetersiz stok: %',p.name; end if;
   up=(x->>'unit_price_vat_included')::numeric; vr=p.vat_rate;
   insert into order_items(order_id,product_id,product_name_snapshot,qty,unit_price_vat_included,purchase_price_snapshot,vat_rate_snapshot,line_total)
   values(oid,p.id,p.name,q,up,p.purchase_price,vr,q*up);
   update products set stock=stock-q,updated_at=now() where id=p.id;
   total=total+q*up; tv=tv+(q*up-(q*up/(1+vr/100)));
 end loop;
 update orders set total_vat_included=total,total_vat=tv,total_net=total-tv where id=oid;
 return oid;
end $$;
grant execute on function public.create_order(uuid,text,jsonb) to authenticated;
