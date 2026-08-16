-- ============================================================
-- TEM AQUI GESTÃO V0.9
-- BANCO CENTRAL + FUNCIONÁRIOS + PDV
-- Execute no MESMO projeto Supabase que hoje guarda o Tem Aqui.
--
-- OBJETIVO:
-- 1) NÃO copiar lojas/produtos para outro banco.
-- 2) Tem Aqui Gestão passa a administrar o banco central existente.
-- 3) Tem Aqui público continua apenas consumindo os dados públicos.
-- 4) Reaproveita store_members já existente (owner/manager/editor).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. FUNÇÕES BASE
-- ------------------------------------------------------------
create or replace function public.gestao_permission_defaults(p_role text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case lower(coalesce(p_role,'editor'))
    when 'owner' then jsonb_build_object(
      'sell',true,'products',true,'stock',true,'customers',true,'credit',true,
      'promotions',true,'reports',true,'cash',true,'staff',true,'settings',true
    )
    when 'manager' then jsonb_build_object(
      'sell',true,'products',true,'stock',true,'customers',true,'credit',true,
      'promotions',true,'reports',true,'cash',true,'staff',false,'settings',true
    )
    else jsonb_build_object(
      'sell',true,'products',true,'stock',true,'customers',true,'credit',true,
      'promotions',true,'reports',true,'cash',false,'staff',false,'settings',false
    )
  end
$$;

-- ------------------------------------------------------------
-- 2. EQUIPE DA LOJA
-- O Tem Aqui antigo já usava store_members com owner/manager/editor.
-- Acrescentamos dados e permissões granulares sem apagar nada.
-- ------------------------------------------------------------
alter table public.store_members
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists whatsapp text,
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists last_access_at timestamptz;

update public.store_members
set permissions = public.gestao_permission_defaults(member_role::text)
where permissions is null or permissions = '{}'::jsonb;

-- Garante que todo proprietário de loja também seja membro OWNER.
insert into public.store_members (store_id,user_id,member_role,active,permissions)
select s.id,s.owner_id,'owner'::public.store_member_role,true,public.gestao_permission_defaults('owner')
from public.stores s
where s.owner_id is not null
on conflict (store_id,user_id) do update
set member_role='owner'::public.store_member_role,
    active=true,
    permissions=public.gestao_permission_defaults('owner');

create table if not exists public.gestao_store_invites (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  email text not null,
  display_name text,
  whatsapp text,
  member_role public.store_member_role not null default 'editor',
  permissions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(store_id,email)
);

create index if not exists gestao_store_invites_store_idx
on public.gestao_store_invites(store_id,created_at desc);

-- ------------------------------------------------------------
-- 3. VERIFICAÇÃO DE PERMISSÕES
-- ------------------------------------------------------------
create or replace function public.gestao_has_store_permission(
  p_store_id uuid,
  p_permission text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_permissions jsonb;
begin
  if v_uid is null then return false; end if;

  if to_regprocedure('public.eh_administrador()') is not null then
    if public.eh_administrador() then return true; end if;
  end if;

  if exists (
    select 1 from public.stores s
    where s.id=p_store_id and s.owner_id=v_uid
  ) then
    return true;
  end if;

  select sm.member_role::text, sm.permissions
    into v_role,v_permissions
  from public.store_members sm
  where sm.store_id=p_store_id
    and sm.user_id=v_uid
    and sm.active=true
  limit 1;

  if v_role is null then return false; end if;
  if v_role='owner' then return true; end if;

  if v_permissions is null or v_permissions='{}'::jsonb then
    v_permissions := public.gestao_permission_defaults(v_role);
  end if;

  return coalesce((v_permissions ->> p_permission)::boolean,false);
exception when others then
  return false;
end;
$$;

grant execute on function public.gestao_has_store_permission(uuid,text) to authenticated;

-- ------------------------------------------------------------
-- 4. LISTAR E MODERAR FUNCIONÁRIOS
-- ------------------------------------------------------------
create or replace function public.gestao_list_store_members(p_store_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  whatsapp text,
  member_role text,
  active boolean,
  permissions jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.gestao_has_store_permission(p_store_id,'staff')
     and not exists(select 1 from public.stores s where s.id=p_store_id and s.owner_id=auth.uid())
  then
    raise exception 'Sem permissão para visualizar funcionários.';
  end if;

  return query
  select
    sm.user_id,
    coalesce(
      nullif(sm.display_name,''),
      nullif(to_jsonb(p)->>'full_name',''),
      nullif(to_jsonb(p)->>'nome',''),
      nullif(to_jsonb(p)->>'name',''),
      nullif(u.raw_user_meta_data->>'full_name',''),
      split_part(coalesce(u.email,sm.email,''),'@',1)
    )::text,
    coalesce(u.email,sm.email,'')::text,
    coalesce(sm.whatsapp, to_jsonb(p)->>'whatsapp','')::text,
    sm.member_role::text,
    sm.active,
    case when sm.permissions is null or sm.permissions='{}'::jsonb
      then public.gestao_permission_defaults(sm.member_role::text)
      else sm.permissions end
  from public.store_members sm
  left join public.profiles p on p.id=sm.user_id
  left join auth.users u on u.id=sm.user_id
  where sm.store_id=p_store_id
  order by
    case sm.member_role::text when 'owner' then 1 when 'manager' then 2 else 3 end,
    full_name;
end;
$$;

grant execute on function public.gestao_list_store_members(uuid) to authenticated;

create or replace function public.gestao_upsert_store_member(
  p_store_id uuid,
  p_email text,
  p_member_role text default 'editor',
  p_permissions jsonb default '{}'::jsonb,
  p_active boolean default true,
  p_display_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_role public.store_member_role;
  v_permissions jsonb;
  v_is_owner boolean;
begin
  if not public.gestao_has_store_permission(p_store_id,'staff')
     and not exists(select 1 from public.stores s where s.id=p_store_id and s.owner_id=auth.uid())
  then
    raise exception 'Sem permissão para gerenciar funcionários.';
  end if;

  v_role := case lower(coalesce(p_member_role,'editor'))
    when 'owner' then 'owner'::public.store_member_role
    when 'manager' then 'manager'::public.store_member_role
    else 'editor'::public.store_member_role
  end;

  select id into v_uid
  from auth.users
  where lower(email)=lower(trim(p_email))
  limit 1;

  if v_uid is null then
    insert into public.gestao_store_invites(
      store_id,email,display_name,member_role,permissions,active,invited_by
    )
    values(
      p_store_id,lower(trim(p_email)),nullif(trim(p_display_name),''),
      v_role,
      case when p_permissions is null or p_permissions='{}'::jsonb
        then public.gestao_permission_defaults(v_role::text) else p_permissions end,
      p_active,auth.uid()
    )
    on conflict(store_id,email) do update
    set display_name=excluded.display_name,
        member_role=excluded.member_role,
        permissions=excluded.permissions,
        active=excluded.active,
        invited_by=auth.uid();

    return jsonb_build_object('pending',true,'email',lower(trim(p_email)));
  end if;

  select exists(
    select 1 from public.stores s where s.id=p_store_id and s.owner_id=v_uid
  ) into v_is_owner;

  if v_is_owner then v_role:='owner'::public.store_member_role; end if;

  v_permissions := case
    when v_is_owner then public.gestao_permission_defaults('owner')
    when p_permissions is null or p_permissions='{}'::jsonb then public.gestao_permission_defaults(v_role::text)
    else p_permissions
  end;

  insert into public.store_members(
    store_id,user_id,member_role,active,permissions,display_name,email
  )
  values(
    p_store_id,v_uid,v_role,p_active,v_permissions,nullif(trim(p_display_name),''),lower(trim(p_email))
  )
  on conflict(store_id,user_id) do update
  set member_role=excluded.member_role,
      active=excluded.active,
      permissions=excluded.permissions,
      display_name=excluded.display_name,
      email=excluded.email,
      updated_at=now();

  delete from public.gestao_store_invites
  where store_id=p_store_id and lower(email)=lower(trim(p_email));

  return jsonb_build_object('pending',false,'user_id',v_uid,'role',v_role::text);
end;
$$;

grant execute on function public.gestao_upsert_store_member(uuid,text,text,jsonb,boolean,text) to authenticated;

create or replace function public.gestao_set_store_member_active(
  p_store_id uuid,
  p_user_id uuid,
  p_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.gestao_has_store_permission(p_store_id,'staff')
     and not exists(select 1 from public.stores s where s.id=p_store_id and s.owner_id=auth.uid())
  then
    raise exception 'Sem permissão para gerenciar funcionários.';
  end if;

  if exists(select 1 from public.stores s where s.id=p_store_id and s.owner_id=p_user_id) then
    raise exception 'O proprietário da loja não pode ser desativado.';
  end if;

  update public.store_members
  set active=p_active,updated_at=now()
  where store_id=p_store_id and user_id=p_user_id;

  return found;
end;
$$;

grant execute on function public.gestao_set_store_member_active(uuid,uuid,boolean) to authenticated;

-- ------------------------------------------------------------
-- 5. CAMPOS DE PDV NO CATÁLOGO CENTRAL
-- Mantém os produtos existentes e só acrescenta o que faltar.
-- ------------------------------------------------------------
alter table public.products
  add column if not exists barcode text,
  add column if not exists sku text,
  add column if not exists cost numeric(12,2) not null default 0,
  add column if not exists unit text not null default 'un.';

create index if not exists products_barcode_store_idx on public.products(store_id,barcode);
create index if not exists products_sku_store_idx on public.products(store_id,sku);

-- ------------------------------------------------------------
-- 6. CATEGORIAS INTERNAS DO ESTOQUE
-- ------------------------------------------------------------
create table if not exists public.gestao_product_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  sort_order integer not null default 999,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id,name)
);

alter table public.gestao_product_categories enable row level security;

drop policy if exists "Gestao categorias loja" on public.gestao_product_categories;
create policy "Gestao categorias loja"
on public.gestao_product_categories
for all to authenticated
using (public.gestao_has_store_permission(store_id,'stock'))
with check (public.gestao_has_store_permission(store_id,'stock'));

grant select,insert,update,delete on public.gestao_product_categories to authenticated;

-- ------------------------------------------------------------
-- 7. CLIENTES / FICHA
-- ------------------------------------------------------------
create table if not exists public.gestao_customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  whatsapp text,
  email text,
  credit_limit numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gestao_customers_store_idx on public.gestao_customers(store_id,name);

create table if not exists public.gestao_customer_ledger (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.gestao_customers(id) on delete cascade,
  sale_id uuid,
  entry_type text not null check(entry_type in ('sale','payment','adjustment')),
  amount numeric(12,2) not null,
  note text,
  operator_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists gestao_customer_ledger_customer_idx
on public.gestao_customer_ledger(customer_id,created_at desc);

alter table public.gestao_customers enable row level security;
alter table public.gestao_customer_ledger enable row level security;

drop policy if exists "Gestao clientes loja" on public.gestao_customers;
create policy "Gestao clientes loja" on public.gestao_customers
for all to authenticated
using (public.gestao_has_store_permission(store_id,'customers'))
with check (public.gestao_has_store_permission(store_id,'customers'));

drop policy if exists "Gestao ficha loja" on public.gestao_customer_ledger;
create policy "Gestao ficha loja" on public.gestao_customer_ledger
for all to authenticated
using (public.gestao_has_store_permission(store_id,'credit'))
with check (public.gestao_has_store_permission(store_id,'credit'));

grant select,insert,update,delete on public.gestao_customers,public.gestao_customer_ledger to authenticated;

-- ------------------------------------------------------------
-- 8. VENDAS / ITENS / CAIXA / MOVIMENTOS
-- ------------------------------------------------------------
create table if not exists public.gestao_sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sale_number bigint generated by default as identity,
  operator_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.gestao_customers(id) on delete set null,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  surcharge numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text,
  cash_received numeric(12,2),
  cash_change numeric(12,2),
  status text not null default 'completed',
  note text,
  created_at timestamptz not null default now()
);
create index if not exists gestao_sales_store_created_idx on public.gestao_sales(store_id,created_at desc);

create table if not exists public.gestao_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.gestao_sales(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null default 1,
  unit text not null default 'un.',
  unit_price numeric(12,2) not null default 0,
  base_price numeric(12,2),
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists gestao_sale_items_sale_idx on public.gestao_sale_items(sale_id);

create table if not exists public.gestao_cash_sessions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  opened_by uuid references auth.users(id) on delete set null,
  closed_by uuid references auth.users(id) on delete set null,
  opening_amount numeric(12,2) not null default 0,
  closing_amount numeric(12,2),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  status text not null default 'open'
);
create index if not exists gestao_cash_sessions_store_idx on public.gestao_cash_sessions(store_id,opened_at desc);

create table if not exists public.gestao_stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  operator_id uuid references auth.users(id) on delete set null,
  movement_type text not null check(movement_type in ('sale','entry','adjustment','return','loss')),
  quantity numeric(14,3) not null,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists gestao_stock_movements_product_idx
on public.gestao_stock_movements(product_id,created_at desc);

alter table public.gestao_sales enable row level security;
alter table public.gestao_sale_items enable row level security;
alter table public.gestao_cash_sessions enable row level security;
alter table public.gestao_stock_movements enable row level security;

drop policy if exists "Gestao vendas loja" on public.gestao_sales;
create policy "Gestao vendas loja" on public.gestao_sales
for all to authenticated
using (public.gestao_has_store_permission(store_id,'sell') or public.gestao_has_store_permission(store_id,'reports'))
with check (public.gestao_has_store_permission(store_id,'sell'));

drop policy if exists "Gestao itens venda loja" on public.gestao_sale_items;
create policy "Gestao itens venda loja" on public.gestao_sale_items
for all to authenticated
using (public.gestao_has_store_permission(store_id,'sell') or public.gestao_has_store_permission(store_id,'reports'))
with check (public.gestao_has_store_permission(store_id,'sell'));

drop policy if exists "Gestao caixa loja" on public.gestao_cash_sessions;
create policy "Gestao caixa loja" on public.gestao_cash_sessions
for all to authenticated
using (public.gestao_has_store_permission(store_id,'cash'))
with check (public.gestao_has_store_permission(store_id,'cash'));

drop policy if exists "Gestao estoque movimentos" on public.gestao_stock_movements;
create policy "Gestao estoque movimentos" on public.gestao_stock_movements
for all to authenticated
using (public.gestao_has_store_permission(store_id,'stock'))
with check (public.gestao_has_store_permission(store_id,'stock'));

grant select,insert,update,delete
on public.gestao_sales,public.gestao_sale_items,public.gestao_cash_sessions,public.gestao_stock_movements
to authenticated;

-- ------------------------------------------------------------
-- 9. CONVITES: quando o usuário entrar pela primeira vez,
-- vincula convites feitos ao e-mail da conta.
-- ------------------------------------------------------------
create or replace function public.gestao_claim_invites()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_count integer := 0;
  r record;
begin
  select lower(email) into v_email from auth.users where id=auth.uid();
  if v_email is null then return 0; end if;

  for r in
    select * from public.gestao_store_invites
    where lower(email)=v_email and active=true and accepted_at is null
  loop
    insert into public.store_members(
      store_id,user_id,member_role,active,permissions,display_name,email
    )
    values(
      r.store_id,auth.uid(),r.member_role,true,
      case when r.permissions='{}'::jsonb then public.gestao_permission_defaults(r.member_role::text) else r.permissions end,
      r.display_name,r.email
    )
    on conflict(store_id,user_id) do update
    set member_role=excluded.member_role,
        active=true,
        permissions=excluded.permissions,
        display_name=coalesce(excluded.display_name,public.store_members.display_name),
        email=excluded.email,
        updated_at=now();

    update public.gestao_store_invites
    set accepted_by=auth.uid(),accepted_at=now()
    where id=r.id;

    v_count:=v_count+1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.gestao_claim_invites() to authenticated;

commit;

-- ============================================================
-- FIM.
-- ESTE SQL NÃO APAGA NENHUMA LOJA NEM PRODUTO DO TEM AQUI.
-- ============================================================
