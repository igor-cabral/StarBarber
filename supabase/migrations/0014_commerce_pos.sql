-- =========================================================
-- 0014_commerce_pos.sql
-- StarBarber V3: loja, reservas de produtos, estoque e PDV/caixa
--
-- Compatível com o schema das migrations 0001-0013.
-- NÃO usa uuid_generate_v4(): UUIDs novos usam gen_random_uuid().
--
-- Escopo:
--   1. Catálogo de produtos por barbearia
--   2. Estoque separado do catálogo público
--   3. Histórico de movimentações de estoque
--   4. Reserva de produtos pelo cliente autenticado
--   5. Frente de caixa / sessões de caixa
--   6. Vendas de produtos e serviços
--   7. Histórico de compras do cliente
--   8. Fotos via Storage (bucket barbershop-media)
--   9. RLS multi-tenant e funções SECURITY DEFINER
-- =========================================================

-- =========================================================
-- 0. Extensão UUID
-- =========================================================
-- gen_random_uuid() é nativo nas versões modernas do PostgreSQL e é
-- suportado pelo Supabase. Não dependemos de uuid_generate_v4().
create extension if not exists pgcrypto;

-- =========================================================
-- 1. PRODUTOS — catálogo público da loja
-- =========================================================
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  name text not null,
  description text,
  sku text,
  price_cents integer not null check (price_cents >= 0),
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_barbershop
  on products(barbershop_id, active, created_at desc);

create unique index if not exists products_barbershop_sku_uidx
  on products(barbershop_id, sku)
  where sku is not null and btrim(sku) <> '';

-- =========================================================
-- 2. ESTOQUE — separado do catálogo para não expor estoque ao público
-- =========================================================
create table if not exists product_inventory (
  product_id uuid primary key references products(id) on delete cascade,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now(),
  check (reserved_quantity <= stock_quantity)
);

create index if not exists idx_product_inventory_low_stock
  on product_inventory(stock_quantity, low_stock_threshold);

-- Garante uma linha de estoque para todo produto.
create or replace function ensure_product_inventory()
returns trigger as $$
begin
  insert into product_inventory(product_id) values (new.id)
  on conflict (product_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_ensure_product_inventory on products;
create trigger trg_ensure_product_inventory
after insert on products
for each row execute function ensure_product_inventory();

insert into product_inventory(product_id)
select id from products
on conflict (product_id) do nothing;

-- =========================================================
-- 3. MOVIMENTAÇÕES DE ESTOQUE — trilha de auditoria
-- =========================================================
create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  movement_type text not null check (
    movement_type in (
      'initial',
      'purchase',
      'sale',
      'reservation',
      'reservation_release',
      'reservation_fulfillment',
      'adjustment',
      'return'
    )
  ),
  quantity_delta integer not null default 0,
  reserved_delta integer not null default 0,
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (quantity_delta <> 0 or reserved_delta <> 0)
);

create index if not exists idx_inventory_movements_product
  on inventory_movements(product_id, created_at desc);

create index if not exists idx_inventory_movements_shop
  on inventory_movements(barbershop_id, created_at desc);

-- =========================================================
-- 4. RESERVAS DE PRODUTOS
-- =========================================================
create table if not exists product_reservations (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,
  code text not null unique,
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'rejected', 'cancelled', 'fulfilled', 'expired')
  ),
  total_cents integer not null default 0 check (total_cents >= 0),
  notes text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_reservations_shop
  on product_reservations(barbershop_id, status, created_at desc);

create index if not exists idx_product_reservations_customer
  on product_reservations(customer_id, created_at desc);

create table if not exists product_reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references product_reservations(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  total_cents integer generated always as (quantity * unit_price_cents) stored,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_reservation_items_reservation
  on product_reservation_items(reservation_id);

-- =========================================================
-- 5. CAIXA / SESSÕES
-- =========================================================
create table if not exists cash_register_sessions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  opened_by uuid not null references auth.users(id) on delete restrict,
  closed_by uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed')),
  opening_amount_cents integer not null default 0 check (opening_amount_cents >= 0),
  expected_amount_cents integer,
  closing_amount_cents integer check (closing_amount_cents is null or closing_amount_cents >= 0),
  difference_cents integer,
  notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index if not exists cash_register_one_open_per_shop_uidx
  on cash_register_sessions(barbershop_id)
  where status = 'open';

create index if not exists idx_cash_register_shop
  on cash_register_sessions(barbershop_id, opened_at desc);

-- =========================================================
-- 6. VENDAS
-- =========================================================
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  cash_register_session_id uuid not null references cash_register_sessions(id) on delete restrict,
  customer_id uuid references customers(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  seller_id uuid references auth.users(id) on delete set null,
  reservation_id uuid references product_reservations(id) on delete set null,
  code text not null unique,
  status text not null default 'completed' check (status in ('completed', 'cancelled')),
  payment_method text not null check (
    payment_method in ('cash', 'pix', 'debit', 'credit', 'other')
  ),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  check (discount_cents <= subtotal_cents),
  check (total_cents = subtotal_cents - discount_cents)
);

create index if not exists idx_sales_shop_date
  on sales(barbershop_id, created_at desc);

create index if not exists idx_sales_customer
  on sales(customer_id, created_at desc);

create index if not exists idx_sales_cash_session
  on sales(cash_register_session_id, created_at desc);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  item_type text not null check (item_type in ('product', 'service')),
  product_id uuid references products(id) on delete restrict,
  service_id uuid references services(id) on delete restrict,
  barber_id uuid references barbers(id) on delete set null,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer generated always as ((quantity * unit_price_cents) - discount_cents) stored,
  created_at timestamptz not null default now(),
  check (
    (item_type = 'product' and product_id is not null and service_id is null)
    or
    (item_type = 'service' and service_id is not null and product_id is null)
  ),
  check (discount_cents <= quantity * unit_price_cents)
);

create index if not exists idx_sale_items_sale on sale_items(sale_id);
create index if not exists idx_sale_items_product on sale_items(product_id) where product_id is not null;

-- =========================================================
-- 7. TRIGGERS updated_at
-- =========================================================
drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
before update on products
for each row execute function set_updated_at();

drop trigger if exists trg_product_inventory_updated_at on product_inventory;
create trigger trg_product_inventory_updated_at
before update on product_inventory
for each row execute function set_updated_at();

drop trigger if exists trg_product_reservations_updated_at on product_reservations;
create trigger trg_product_reservations_updated_at
before update on product_reservations
for each row execute function set_updated_at();

-- =========================================================
-- 8. HELPERS SECURITY DEFINER
-- =========================================================
create or replace function commerce_customer_id()
returns uuid as $$
  select c.id
  from customers c
  where c.auth_user_id = auth.uid()
  order by c.created_at asc
  limit 1;
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function commerce_customer_owns_reservation(p_reservation_id uuid)
returns boolean as $$
  select exists (
    select 1
    from product_reservations r
    join customers c on c.id = r.customer_id
    where r.id = p_reservation_id
      and c.auth_user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function commerce_customer_owns_sale(p_sale_id uuid)
returns boolean as $$
  select exists (
    select 1
    from sales s
    join customers c on c.id = s.customer_id
    where s.id = p_sale_id
      and c.auth_user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function commerce_staff_can_manage(p_barbershop_id uuid)
returns boolean as $$
  select p.barbershop_id = auth_barbershop_id()
    and auth_role() in ('admin', 'caixa');
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function commerce_admin_can_manage(p_barbershop_id uuid)
returns boolean as $$
  select p.barbershop_id = auth_barbershop_id()
    and auth_role() = 'admin';
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function commerce_product_belongs_to_reservation(p_item_id uuid)
returns boolean as $$
  select exists (
    select 1
    from product_reservation_items pri
    join product_reservations r on r.id = pri.reservation_id
    join customers c on c.id = r.customer_id
    where pri.id = p_item_id
      and c.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from product_reservation_items pri
    join product_reservations r on r.id = pri.reservation_id
    where pri.id = p_item_id
      and r.barbershop_id = auth_barbershop_id()
      and auth_role() in ('admin', 'caixa')
  );
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function commerce_sale_item_visible(p_item_id uuid)
returns boolean as $$
  select exists (
    select 1
    from sale_items si
    join sales s on s.id = si.sale_id
    join customers c on c.id = s.customer_id
    where si.id = p_item_id
      and c.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from sale_items si
    join sales s on s.id = si.sale_id
    where si.id = p_item_id
      and s.barbershop_id = auth_barbershop_id()
      and auth_role() in ('admin', 'caixa')
  );
$$ language sql stable security definer set search_path = public, pg_temp;

-- =========================================================
-- 9. CÓDIGOS HUMANOS
-- =========================================================
create or replace function generate_product_reservation_code()
returns text as $$
declare
  v_code text;
begin
  loop
    v_code := 'RES-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7));
    exit when not exists (select 1 from product_reservations where code = v_code);
  end loop;
  return v_code;
end;
$$ language plpgsql volatile set search_path = public, pg_temp;

create or replace function generate_sale_code()
returns text as $$
declare
  v_code text;
begin
  loop
    v_code := 'VEN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from sales where code = v_code);
  end loop;
  return v_code;
end;
$$ language plpgsql volatile set search_path = public, pg_temp;

-- =========================================================
-- 10. AJUSTE DE ESTOQUE
-- =========================================================
create or replace function adjust_product_stock(
  p_product_id uuid,
  p_quantity_delta integer,
  p_note text default null
)
returns integer as $$
declare
  v_shop uuid;
  v_new_stock integer;
  v_reserved integer;
begin
  if auth.uid() is null or auth_role() <> 'admin' then
    raise exception 'Somente o administrador pode ajustar estoque.';
  end if;

  select barbershop_id into v_shop
  from products
  where id = p_product_id and active;

  if v_shop is null or v_shop <> auth_barbershop_id() then
    raise exception 'Produto inválido para esta barbearia.';
  end if;

  insert into product_inventory(product_id)
  values (p_product_id)
  on conflict (product_id) do nothing;

  select stock_quantity, reserved_quantity
  into v_new_stock, v_reserved
  from product_inventory
  where product_id = p_product_id
  for update;

  v_new_stock := v_new_stock + p_quantity_delta;

  if v_new_stock < v_reserved then
    raise exception 'O estoque não pode ficar abaixo da quantidade reservada.';
  end if;

  if v_new_stock < 0 then
    raise exception 'Estoque insuficiente.';
  end if;

  update product_inventory
  set stock_quantity = v_new_stock
  where product_id = p_product_id;

  insert into inventory_movements(
    barbershop_id, product_id, movement_type, quantity_delta,
    reference_type, note, created_by
  ) values (
    v_shop, p_product_id, 'adjustment', p_quantity_delta,
    'manual', p_note, auth.uid()
  );

  return v_new_stock;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke all on function adjust_product_stock(uuid, integer, text) from public;
grant execute on function adjust_product_stock(uuid, integer, text) to authenticated;

-- =========================================================
-- 11. RESERVA DE PRODUTOS PELO CLIENTE
-- p_items:
-- [
--   {"product_id":"uuid", "quantity":2},
--   {"product_id":"uuid", "quantity":1}
-- ]
-- =========================================================
create or replace function create_product_reservation(
  p_barbershop_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns table (reservation_id uuid, reservation_code text, total_cents integer) as $$
declare
  v_uid uuid := auth.uid();
  v_customer_id uuid;
  v_reservation_id uuid;
  v_code text;
  v_total integer := 0;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_name text;
  v_price integer;
  v_stock integer;
  v_reserved integer;
  v_track boolean;
  v_shop uuid;
begin
  if v_uid is null then
    raise exception 'Faça login para reservar produtos.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione pelo menos um produto à reserva.';
  end if;

  if not exists (
    select 1 from barbershops
    where id = p_barbershop_id and active
  ) then
    raise exception 'Barbearia inválida ou inativa.';
  end if;

  -- O cliente pode reservar mesmo antes de fazer o primeiro agendamento.
  -- Se ainda não houver cadastro local, criamos o customer a partir dos
  -- metadados do próprio usuário autenticado, exigindo o mesmo consentimento
  -- usado pelo fluxo de agendamento.
  select c.id into v_customer_id
  from customers c
  where c.barbershop_id = p_barbershop_id
    and c.auth_user_id = v_uid
  limit 1;

  if v_customer_id is null then
    if not exists (
      select 1
      from auth.users u
      where u.id = v_uid
        and (u.raw_user_meta_data->>'accepted_terms') = 'true'
    ) then
      raise exception 'É necessário aceitar os Termos de Uso e a Política de Privacidade para reservar produtos.';
    end if;

    if nullif(btrim((select raw_user_meta_data->>'phone' from auth.users where id = v_uid)), '') is null then
      raise exception 'Seu WhatsApp não está cadastrado. Atualize seu cadastro antes de reservar produtos.';
    end if;

    insert into customers(
      barbershop_id, auth_user_id, name, whatsapp,
      privacy_accepted_at, privacy_policy_version
    )
    select
      p_barbershop_id,
      v_uid,
      coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), 'Cliente'),
      btrim(u.raw_user_meta_data->>'phone'),
      now(),
      current_terms_version()
    from auth.users u
    where u.id = v_uid
    on conflict (barbershop_id, auth_user_id) where auth_user_id is not null
    do update set
      name = excluded.name,
      whatsapp = excluded.whatsapp,
      privacy_accepted_at = coalesce(customers.privacy_accepted_at, excluded.privacy_accepted_at),
      privacy_policy_version = coalesce(customers.privacy_policy_version, excluded.privacy_policy_version)
    returning id into v_customer_id;
  end if;

  v_code := generate_product_reservation_code();

  insert into product_reservations(
    barbershop_id, customer_id, code, status, notes, expires_at
  ) values (
    p_barbershop_id, v_customer_id, v_code, 'pending',
    nullif(btrim(p_notes), ''), now() + interval '48 hours'
  ) returning id into v_reservation_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_qty := (v_item->>'quantity')::integer;

    if v_product_id is null or v_qty is null or v_qty <= 0 then
      raise exception 'Item de reserva inválido.';
    end if;

    select p.name, p.price_cents, p.barbershop_id
    into v_name, v_price, v_shop
    from products p
    where p.id = v_product_id
      and p.barbershop_id = p_barbershop_id
      and p.active
    for update;

    select stock_quantity, reserved_quantity
    into v_stock, v_reserved
    from product_inventory
    where product_id = v_product_id
    for update;

    if v_name is null or v_shop <> p_barbershop_id then
      raise exception 'Produto inválido ou indisponível.';
    end if;

    v_track := true;

    if (v_stock - v_reserved) < v_qty then
      raise exception 'Estoque insuficiente para o produto: %.', v_name;
    end if;

    insert into product_reservation_items(
      reservation_id, product_id, product_name, quantity, unit_price_cents
    ) values (
      v_reservation_id, v_product_id, v_name, v_qty, v_price
    );

    v_total := v_total + (v_qty * v_price);

    if v_track then
      update product_inventory
      set reserved_quantity = reserved_quantity + v_qty
      where product_id = v_product_id;

      insert into inventory_movements(
        barbershop_id, product_id, movement_type, reserved_delta,
        reference_type, reference_id, created_by
      ) values (
        p_barbershop_id, v_product_id, 'reservation', v_qty,
        'product_reservation', v_reservation_id, v_uid
      );
    end if;
  end loop;

  update product_reservations
  set total_cents = v_total
  where id = v_reservation_id;

  return query
    select v_reservation_id, v_code, v_total;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke all on function create_product_reservation(uuid, jsonb, text) from public;
grant execute on function create_product_reservation(uuid, jsonb, text) to authenticated;

-- =========================================================
-- 12. STATUS DA RESERVA — admin/caixa
-- Rejeitar/cancelar libera o reservado.
-- Confirmar mantém o reservado.
-- =========================================================
create or replace function update_product_reservation_status(
  p_reservation_id uuid,
  p_status text,
  p_notes text default null
)
returns void as $$
declare
  v_res product_reservations%rowtype;
  v_item record;
  v_uid uuid := auth.uid();
begin
  if v_uid is null or auth_role() not in ('admin', 'caixa') then
    raise exception 'Somente admin ou caixa pode alterar reservas.';
  end if;

  if p_status not in ('confirmed', 'rejected', 'cancelled', 'expired') then
    raise exception 'Status inválido para esta operação.';
  end if;

  select * into v_res
  from product_reservations
  where id = p_reservation_id
    and barbershop_id = auth_barbershop_id()
  for update;

  if v_res.id is null then
    raise exception 'Reserva não encontrada.';
  end if;

  if v_res.status in ('fulfilled', 'rejected', 'cancelled', 'expired') then
    raise exception 'Esta reserva já foi encerrada.';
  end if;

  if p_status = 'confirmed' then
    update product_reservations
    set status = 'confirmed',
        notes = coalesce(nullif(btrim(p_notes), ''), notes)
    where id = p_reservation_id;
    return;
  end if;

  for v_item in
    select pri.product_id, pri.quantity
    from product_reservation_items pri
    where pri.reservation_id = p_reservation_id
  loop
    update product_inventory
    set reserved_quantity = reserved_quantity - v_item.quantity
    where product_id = v_item.product_id;

    insert into inventory_movements(
      barbershop_id, product_id, movement_type, reserved_delta,
      reference_type, reference_id, note, created_by
    ) values (
      v_res.barbershop_id, v_item.product_id, 'reservation_release',
      -v_item.quantity, 'product_reservation', p_reservation_id,
      p_status, v_uid
    );
  end loop;

  update product_reservations
  set status = p_status,
      notes = coalesce(nullif(btrim(p_notes), ''), notes)
  where id = p_reservation_id;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke all on function update_product_reservation_status(uuid, text, text) from public;
grant execute on function update_product_reservation_status(uuid, text, text) to authenticated;

-- =========================================================
-- 13. ABERTURA DE CAIXA
-- =========================================================
create or replace function open_cash_register(
  p_barbershop_id uuid,
  p_opening_amount_cents integer default 0,
  p_notes text default null
)
returns uuid as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or auth_role() not in ('admin', 'caixa') then
    raise exception 'Somente admin ou caixa pode abrir o caixa.';
  end if;

  if p_barbershop_id <> auth_barbershop_id() then
    raise exception 'Barbearia inválida.';
  end if;

  if p_opening_amount_cents < 0 then
    raise exception 'Valor de abertura inválido.';
  end if;

  insert into cash_register_sessions(
    barbershop_id, opened_by, opening_amount_cents, notes
  ) values (
    p_barbershop_id, auth.uid(), p_opening_amount_cents,
    nullif(btrim(p_notes), '')
  ) returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'Já existe um caixa aberto para esta barbearia.';
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke all on function open_cash_register(uuid, integer, text) from public;
grant execute on function open_cash_register(uuid, integer, text) to authenticated;

-- =========================================================
-- 14. FECHAMENTO DE CAIXA
-- O valor esperado considera somente vendas em dinheiro.
-- PIX/cartão não entram no dinheiro físico do caixa.
-- =========================================================
create or replace function close_cash_register(
  p_session_id uuid,
  p_closing_amount_cents integer,
  p_notes text default null
)
returns table (
  expected_amount_cents integer,
  closing_amount_cents integer,
  difference_cents integer
) as $$
declare
  v_session cash_register_sessions%rowtype;
  v_cash_sales integer;
  v_expected integer;
  v_difference integer;
begin
  if auth.uid() is null or auth_role() not in ('admin', 'caixa') then
    raise exception 'Somente admin ou caixa pode fechar o caixa.';
  end if;

  if p_closing_amount_cents < 0 then
    raise exception 'Valor de fechamento inválido.';
  end if;

  select * into v_session
  from cash_register_sessions
  where id = p_session_id
    and barbershop_id = auth_barbershop_id()
  for update;

  if v_session.id is null then
    raise exception 'Sessão de caixa não encontrada.';
  end if;

  if v_session.status <> 'open' then
    raise exception 'Este caixa já está fechado.';
  end if;

  select coalesce(sum(total_cents), 0)
  into v_cash_sales
  from sales
  where cash_register_session_id = p_session_id
    and status = 'completed'
    and payment_method = 'cash';

  v_expected := v_session.opening_amount_cents + v_cash_sales;
  v_difference := p_closing_amount_cents - v_expected;

  update cash_register_sessions
  set status = 'closed',
      closed_by = auth.uid(),
      expected_amount_cents = v_expected,
      closing_amount_cents = p_closing_amount_cents,
      difference_cents = v_difference,
      notes = coalesce(nullif(btrim(p_notes), ''), notes),
      closed_at = now()
  where id = p_session_id;

  return query select v_expected, p_closing_amount_cents, v_difference;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke all on function close_cash_register(uuid, integer, text) from public;
grant execute on function close_cash_register(uuid, integer, text) to authenticated;

-- =========================================================
-- 15. VENDA / PDV
-- p_items:
-- [
--   {"item_type":"product", "product_id":"uuid", "quantity":2},
--   {"item_type":"service", "service_id":"uuid", "quantity":1, "barber_id":"uuid"}
-- ]
--
-- Os preços NÃO são aceitos do cliente. A função lê os preços atuais
-- do banco e calcula tudo no servidor.
-- =========================================================
create or replace function create_sale(
  p_cash_register_session_id uuid,
  p_payment_method text,
  p_items jsonb default '[]'::jsonb,
  p_customer_id uuid default null,
  p_appointment_id uuid default null,
  p_discount_cents integer default 0,
  p_notes text default null,
  p_reservation_id uuid default null
)
returns table (sale_id uuid, sale_code text, subtotal_cents integer, total_cents integer) as $$
declare
  v_uid uuid := auth.uid();
  v_session cash_register_sessions%rowtype;
  v_sale_id uuid;
  v_code text;
  v_item jsonb;
  v_item_type text;
  v_product_id uuid;
  v_service_id uuid;
  v_barber_id uuid;
  v_qty integer;
  v_name text;
  v_price integer;
  v_subtotal integer := 0;
  v_total integer;
  v_stock integer;
  v_reserved integer;
  v_res product_reservations%rowtype;
  v_res_item record;
  v_customer_shop uuid;
  v_appointment_shop uuid;
  v_barber_shop uuid;
  v_sale_item_total integer;
begin
  if v_uid is null or auth_role() not in ('admin', 'caixa') then
    raise exception 'Somente admin ou caixa pode registrar vendas.';
  end if;

  if p_payment_method not in ('cash', 'pix', 'debit', 'credit', 'other') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  if p_discount_cents < 0 then
    raise exception 'Desconto inválido.';
  end if;

  select * into v_session
  from cash_register_sessions
  where id = p_cash_register_session_id
    and barbershop_id = auth_barbershop_id()
  for update;

  if v_session.id is null or v_session.status <> 'open' then
    raise exception 'Abra o caixa antes de registrar uma venda.';
  end if;

  if p_customer_id is not null then
    select barbershop_id into v_customer_shop
    from customers
    where id = p_customer_id;
    if v_customer_shop is null or v_customer_shop <> auth_barbershop_id() then
      raise exception 'Cliente inválido para esta barbearia.';
    end if;
  end if;

  if p_appointment_id is not null then
    select barbershop_id into v_appointment_shop
    from appointments
    where id = p_appointment_id;
    if v_appointment_shop is null or v_appointment_shop <> auth_barbershop_id() then
      raise exception 'Agendamento inválido para esta barbearia.';
    end if;
  end if;

  if p_reservation_id is not null then
    select * into v_res
    from product_reservations
    where id = p_reservation_id
      and barbershop_id = auth_barbershop_id()
    for update;

    if v_res.id is null then
      raise exception 'Reserva não encontrada.';
    end if;

    if v_res.status not in ('pending', 'confirmed') then
      raise exception 'Esta reserva não pode mais ser faturada.';
    end if;

    if p_customer_id is null then
      p_customer_id := v_res.customer_id;
    elsif p_customer_id <> v_res.customer_id then
      raise exception 'A reserva pertence a outro cliente.';
    end if;

    for v_res_item in
      select pri.product_id, pri.product_name, pri.quantity, pri.unit_price_cents
      from product_reservation_items pri
      where pri.reservation_id = p_reservation_id
    loop
      select p.name, p.barbershop_id
      into v_name, v_barber_shop
      from products p
      where p.id = v_res_item.product_id
        and p.barbershop_id = auth_barbershop_id()
      for update;

      select stock_quantity, reserved_quantity
      into v_stock, v_reserved
      from product_inventory
      where product_id = v_res_item.product_id
      for update;

      if v_name is null then
        raise exception 'Um produto da reserva não está mais disponível.';
      end if;

      if v_stock < v_res_item.quantity then
        raise exception 'Estoque físico insuficiente para %.', v_res_item.product_name;
      end if;

      v_subtotal := v_subtotal + v_res_item.quantity * v_res_item.unit_price_cents;
    end loop;
  else
    if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
      raise exception 'Adicione pelo menos um item à venda.';
    end if;

    for v_item in select value from jsonb_array_elements(p_items)
    loop
      v_item_type := v_item->>'item_type';
      v_qty := (v_item->>'quantity')::integer;

      if v_qty is null or v_qty <= 0 then
        raise exception 'Quantidade inválida na venda.';
      end if;

      if v_item_type = 'product' then
        v_product_id := nullif(v_item->>'product_id', '')::uuid;

        select p.name, p.price_cents
        into v_name, v_price
        from products p
        where p.id = v_product_id
          and p.barbershop_id = auth_barbershop_id()
          and p.active
        for update;

        select stock_quantity, reserved_quantity
        into v_stock, v_reserved
        from product_inventory
        where product_id = v_product_id
        for update;

        if v_name is null then
          raise exception 'Produto inválido ou inativo.';
        end if;

        if (v_stock - v_reserved) < v_qty then
          raise exception 'Estoque disponível insuficiente para %.', v_name;
        end if;

        v_subtotal := v_subtotal + (v_qty * v_price);

      elsif v_item_type = 'service' then
        v_service_id := nullif(v_item->>'service_id', '')::uuid;
        v_barber_id := nullif(v_item->>'barber_id', '')::uuid;

        select s.name, s.price_cents
        into v_name, v_price
        from services s
        where s.id = v_service_id
          and s.barbershop_id = auth_barbershop_id()
          and s.active;

        if v_name is null then
          raise exception 'Serviço inválido ou inativo.';
        end if;

        if v_barber_id is not null then
          select b.barbershop_id into v_barber_shop
          from barbers b
          where b.id = v_barber_id and b.active;
          if v_barber_shop is null or v_barber_shop <> auth_barbershop_id() then
            raise exception 'Profissional inválido para esta venda.';
          end if;
        end if;

        v_subtotal := v_subtotal + (v_qty * v_price);
      else
        raise exception 'Tipo de item inválido. Use product ou service.';
      end if;
    end loop;
  end if;

  if p_discount_cents > v_subtotal then
    raise exception 'O desconto não pode ser maior que o subtotal.';
  end if;

  v_total := v_subtotal - p_discount_cents;
  v_code := generate_sale_code();

  insert into sales(
    barbershop_id, cash_register_session_id, customer_id, appointment_id,
    seller_id, reservation_id, code, payment_method,
    subtotal_cents, discount_cents, total_cents, notes
  ) values (
    auth_barbershop_id(), p_cash_register_session_id, p_customer_id,
    p_appointment_id, v_uid, p_reservation_id, v_code, p_payment_method,
    v_subtotal, p_discount_cents, v_total, nullif(btrim(p_notes), '')
  ) returning id into v_sale_id;

  if p_reservation_id is not null then
    for v_res_item in
      select pri.product_id, pri.product_name, pri.quantity, pri.unit_price_cents
      from product_reservation_items pri
      where pri.reservation_id = p_reservation_id
    loop
      insert into sale_items(
        sale_id, item_type, product_id, item_name, quantity, unit_price_cents
      ) values (
        v_sale_id, 'product', v_res_item.product_id, v_res_item.product_name,
        v_res_item.quantity, v_res_item.unit_price_cents
      );

      update product_inventory
      set stock_quantity = stock_quantity - v_res_item.quantity,
          reserved_quantity = reserved_quantity - v_res_item.quantity
      where product_id = v_res_item.product_id;

      insert into inventory_movements(
        barbershop_id, product_id, movement_type, quantity_delta, reserved_delta,
        reference_type, reference_id, created_by
      ) values (
        auth_barbershop_id(), v_res_item.product_id, 'reservation_fulfillment',
        -v_res_item.quantity, -v_res_item.quantity,
        'sale', v_sale_id, v_uid
      );
    end loop;

    update product_reservations
    set status = 'fulfilled'
    where id = p_reservation_id;
  else
    for v_item in select value from jsonb_array_elements(p_items)
    loop
      v_item_type := v_item->>'item_type';
      v_qty := (v_item->>'quantity')::integer;

      if v_item_type = 'product' then
        v_product_id := nullif(v_item->>'product_id', '')::uuid;
        v_barber_id := null;

        select p.name, p.price_cents
        into v_name, v_price
        from products p
        where p.id = v_product_id
          and p.barbershop_id = auth_barbershop_id()
          and p.active
        for update;

        insert into sale_items(
          sale_id, item_type, product_id, item_name, quantity, unit_price_cents
        ) values (
          v_sale_id, 'product', v_product_id, v_name, v_qty, v_price
        );

        update product_inventory
        set stock_quantity = stock_quantity - v_qty
        where product_id = v_product_id
          and stock_quantity - reserved_quantity >= v_qty;

        if not found then
          raise exception 'Estoque disponível insuficiente para %.', v_name;
        end if;

        insert into inventory_movements(
          barbershop_id, product_id, movement_type, quantity_delta,
          reference_type, reference_id, created_by
        ) values (
          auth_barbershop_id(), v_product_id, 'sale', -v_qty,
          'sale', v_sale_id, v_uid
        );

      else
        v_service_id := nullif(v_item->>'service_id', '')::uuid;
        v_barber_id := nullif(v_item->>'barber_id', '')::uuid;

        select s.name, s.price_cents
        into v_name, v_price
        from services s
        where s.id = v_service_id
          and s.barbershop_id = auth_barbershop_id()
          and s.active;

        if v_name is null then
          raise exception 'Serviço inválido ou inativo.';
        end if;

        insert into sale_items(
          sale_id, item_type, service_id, barber_id, item_name,
          quantity, unit_price_cents
        ) values (
          v_sale_id, 'service', v_service_id, v_barber_id, v_name,
          v_qty, v_price
        );
      end if;
    end loop;
  end if;

  return query select v_sale_id, v_code, v_subtotal, v_total;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke all on function create_sale(uuid, text, jsonb, uuid, uuid, integer, text, uuid) from public;
grant execute on function create_sale(uuid, text, jsonb, uuid, uuid, integer, text, uuid) to authenticated;

-- =========================================================
-- 16. CANCELAR RESERVA DO PRÓPRIO CLIENTE
-- =========================================================
create or replace function cancel_own_product_reservation(p_reservation_id uuid)
returns void as $$
declare
  v_res product_reservations%rowtype;
  v_item record;
begin
  if auth.uid() is null then
    raise exception 'Faça login para cancelar sua reserva.';
  end if;

  select r.* into v_res
  from product_reservations r
  join customers c on c.id = r.customer_id
  where r.id = p_reservation_id
    and c.auth_user_id = auth.uid()
  for update;

  if v_res.id is null then
    raise exception 'Reserva não encontrada.';
  end if;

  if v_res.status not in ('pending', 'confirmed') then
    raise exception 'Esta reserva não pode mais ser cancelada.';
  end if;

  for v_item in
    select product_id, quantity
    from product_reservation_items
    where reservation_id = p_reservation_id
  loop
    update product_inventory
    set reserved_quantity = reserved_quantity - v_item.quantity
    where product_id = v_item.product_id;

    insert into inventory_movements(
      barbershop_id, product_id, movement_type, reserved_delta,
      reference_type, reference_id, created_by
    ) values (
      v_res.barbershop_id, v_item.product_id, 'reservation_release',
      -v_item.quantity, 'product_reservation', p_reservation_id, auth.uid()
    );
  end loop;

  update product_reservations
  set status = 'cancelled'
  where id = p_reservation_id;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke all on function cancel_own_product_reservation(uuid) from public;
grant execute on function cancel_own_product_reservation(uuid) to authenticated;

-- =========================================================
-- 17. RLS — PRODUTOS
-- =========================================================
alter table products enable row level security;

create policy "products_public_read_active"
on products for select
using (active = true);

create policy "products_staff_read_all"
on products for select
using (barbershop_id = auth_barbershop_id());

create policy "products_admin_insert"
on products for insert
with check (
  barbershop_id = auth_barbershop_id()
  and auth_role() = 'admin'
);

create policy "products_admin_update"
on products for update
using (
  barbershop_id = auth_barbershop_id()
  and auth_role() = 'admin'
)
with check (
  barbershop_id = auth_barbershop_id()
  and auth_role() = 'admin'
);

create policy "products_admin_delete"
on products for delete
using (
  barbershop_id = auth_barbershop_id()
  and auth_role() = 'admin'
);

create policy "products_master_all"
on products for all
using (is_master())
with check (is_master());

-- =========================================================
-- 18. RLS — ESTOQUE
-- =========================================================
alter table product_inventory enable row level security;

create policy "product_inventory_staff_read"
on product_inventory for select
using (
  exists (
    select 1 from products p
    where p.id = product_inventory.product_id
      and p.barbershop_id = auth_barbershop_id()
  )
  and auth_role() in ('admin', 'caixa')
);

create policy "product_inventory_admin_write"
on product_inventory for all
using (
  exists (
    select 1 from products p
    where p.id = product_inventory.product_id
      and p.barbershop_id = auth_barbershop_id()
  )
  and auth_role() = 'admin'
)
with check (
  exists (
    select 1 from products p
    where p.id = product_inventory.product_id
      and p.barbershop_id = auth_barbershop_id()
  )
  and auth_role() = 'admin'
);

create policy "product_inventory_master_all"
on product_inventory for all
using (is_master())
with check (is_master());

-- =========================================================
-- 19. RLS — MOVIMENTAÇÕES
-- =========================================================
alter table inventory_movements enable row level security;

create policy "inventory_movements_staff_read"
on inventory_movements for select
using (
  barbershop_id = auth_barbershop_id()
  and auth_role() in ('admin', 'caixa')
);

create policy "inventory_movements_master_all"
on inventory_movements for all
using (is_master())
with check (is_master());

-- Nenhum INSERT/UPDATE/DELETE direto para usuários normais.
-- Movimentações são criadas pelas funções SECURITY DEFINER.

-- =========================================================
-- 20. RLS — RESERVAS
-- =========================================================
alter table product_reservations enable row level security;

create policy "product_reservations_customer_read"
on product_reservations for select
using (commerce_customer_owns_reservation(id));

create policy "product_reservations_staff_read"
on product_reservations for select
using (
  barbershop_id = auth_barbershop_id()
  and auth_role() in ('admin', 'caixa')
);

create policy "product_reservations_master_all"
on product_reservations for all
using (is_master())
with check (is_master());

alter table product_reservation_items enable row level security;

create policy "product_reservation_items_visible"
on product_reservation_items for select
using (commerce_product_belongs_to_reservation(id));

create policy "product_reservation_items_master_all"
on product_reservation_items for all
using (is_master())
with check (is_master());

-- =========================================================
-- 21. RLS — CAIXA
-- =========================================================
alter table cash_register_sessions enable row level security;

create policy "cash_register_staff_read"
on cash_register_sessions for select
using (
  barbershop_id = auth_barbershop_id()
  and auth_role() in ('admin', 'caixa')
);

create policy "cash_register_master_all"
on cash_register_sessions for all
using (is_master())
with check (is_master());

-- =========================================================
-- 22. RLS — VENDAS
-- =========================================================
alter table sales enable row level security;

create policy "sales_staff_read"
on sales for select
using (
  barbershop_id = auth_barbershop_id()
  and auth_role() in ('admin', 'caixa')
);

create policy "sales_customer_read"
on sales for select
using (commerce_customer_owns_sale(id));

create policy "sales_master_all"
on sales for all
using (is_master())
with check (is_master());

alter table sale_items enable row level security;

create policy "sale_items_visible"
on sale_items for select
using (commerce_sale_item_visible(id));

create policy "sale_items_master_all"
on sale_items for all
using (is_master())
with check (is_master());

-- =========================================================
-- 23. GRANTS
-- =========================================================
-- Catálogo: público pode ler apenas o que a RLS liberar.
grant select on products to anon, authenticated;
grant insert, update, delete on products to authenticated;

-- Estoque e histórico: leitura somente autenticada.
grant select on product_inventory to authenticated;
grant select on inventory_movements to authenticated;

-- Reservas: leitura autenticada; escrita ocorre via RPC.
grant select on product_reservations to authenticated;
grant select on product_reservation_items to authenticated;

-- Caixa e vendas: leitura autenticada; escrita ocorre via RPC.
grant select on cash_register_sessions to authenticated;
grant select on sales to authenticated;
grant select on sale_items to authenticated;

-- Sem acesso anônimo às tabelas internas.
revoke all on product_inventory from anon;
revoke all on inventory_movements from anon;
revoke all on product_reservations from anon;
revoke all on product_reservation_items from anon;
revoke all on cash_register_sessions from anon;
revoke all on sales from anon;
revoke all on sale_items from anon;

-- Evita escrita direta em tabelas transacionais.
revoke insert, update, delete on product_inventory from authenticated;
revoke insert, update, delete on inventory_movements from authenticated;
revoke insert, update, delete on product_reservations from authenticated;
revoke insert, update, delete on product_reservation_items from authenticated;
revoke insert, update, delete on cash_register_sessions from authenticated;
revoke insert, update, delete on sales from authenticated;
revoke insert, update, delete on sale_items from authenticated;

-- =========================================================
-- 24. STORAGE — fotos de produtos, serviços, profissionais e logo
-- =========================================================
-- O bucket é público somente para LEITURA. Upload/delete continuam
-- protegidos por policies de storage.
insert into storage.buckets (id, name, public)
values ('barbershop-media', 'barbershop-media', true)
on conflict (id) do update set public = true;

-- Leitura pública das imagens do bucket.
drop policy if exists "barbershop_media_public_read" on storage.objects;
create policy "barbershop_media_public_read"
on storage.objects for select
to public
using (bucket_id = 'barbershop-media');

-- Upload somente para admin/caixa da própria barbearia.
-- Estrutura esperada do caminho:
--   <barbershop_id>/products/<arquivo>
--   <barbershop_id>/barbers/<arquivo>
--   <barbershop_id>/services/<arquivo>
--   <barbershop_id>/branding/<arquivo>
drop policy if exists "barbershop_media_staff_insert" on storage.objects;
create policy "barbershop_media_staff_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'barbershop-media'
  and (storage.foldername(name))[1] = auth_barbershop_id()::text
  and (storage.foldername(name))[2] in ('products', 'barbers', 'services', 'branding')
  and auth_role() in ('admin', 'caixa')
);

-- Atualização/exclusão somente no próprio tenant.
drop policy if exists "barbershop_media_staff_update" on storage.objects;
create policy "barbershop_media_staff_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'barbershop-media'
  and (storage.foldername(name))[1] = auth_barbershop_id()::text
  and auth_role() in ('admin', 'caixa')
)
with check (
  bucket_id = 'barbershop-media'
  and (storage.foldername(name))[1] = auth_barbershop_id()::text
  and auth_role() in ('admin', 'caixa')
);

drop policy if exists "barbershop_media_staff_delete" on storage.objects;
create policy "barbershop_media_staff_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'barbershop-media'
  and (storage.foldername(name))[1] = auth_barbershop_id()::text
  and auth_role() in ('admin', 'caixa')
);

-- =========================================================
-- 25. MASTER — acesso administrativo completo às tabelas novas
-- =========================================================
-- As policies *_master_all acima já dão acesso via RLS.
-- =========================================================

-- Fim da migration 0014.

-- =========================================================
-- 26. EXPIRAÇÃO DE RESERVAS VENCIDAS
-- Pode ser chamada por um cron/Edge Function posteriormente.
-- Também é segura para ser chamada manualmente pelo admin/caixa.
-- =========================================================
create or replace function expire_product_reservations()
returns integer as $$
declare
  v_res record;
  v_item record;
  v_count integer := 0;
begin
  if auth.uid() is not null and auth_role() not in ('admin', 'caixa', 'master') then
    raise exception 'Sem permissão para expirar reservas.';
  end if;

  for v_res in
    select r.id, r.barbershop_id
    from product_reservations r
    where r.status in ('pending', 'confirmed')
      and r.expires_at is not null
      and r.expires_at <= now()
      and (
        auth.uid() is null
        or r.barbershop_id = auth_barbershop_id()
        or is_master()
      )
    for update
  loop
    for v_item in
      select product_id, quantity
      from product_reservation_items
      where reservation_id = v_res.id
    loop
      update product_inventory
      set reserved_quantity = reserved_quantity - v_item.quantity
      where product_id = v_item.product_id;

      insert into inventory_movements(
        barbershop_id, product_id, movement_type, reserved_delta,
        reference_type, reference_id, created_by
      ) values (
        v_res.barbershop_id, v_item.product_id, 'reservation_release',
        -v_item.quantity, 'product_reservation', v_res.id, auth.uid()
      );
    end loop;

    update product_reservations
    set status = 'expired'
    where id = v_res.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke all on function expire_product_reservations() from public;
grant execute on function expire_product_reservations() to authenticated;

-- =========================================================
-- 27. HARDENING DE EXECUTE
-- Funções internas não precisam ficar expostas ao cliente.
-- =========================================================
revoke all on function ensure_product_inventory() from public;
revoke all on function commerce_customer_id() from public;
revoke all on function commerce_customer_owns_reservation(uuid) from public;
revoke all on function commerce_customer_owns_sale(uuid) from public;
revoke all on function commerce_staff_can_manage(uuid) from public;
revoke all on function commerce_admin_can_manage(uuid) from public;
revoke all on function commerce_product_belongs_to_reservation(uuid) from public;
revoke all on function commerce_sale_item_visible(uuid) from public;
revoke all on function generate_product_reservation_code() from public;
revoke all on function generate_sale_code() from public;

-- =========================================================
-- Fim da migration 0014.
-- =========================================================
