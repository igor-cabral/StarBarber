-- =========================================================
-- 0003_rls.sql
-- Row Level Security — isolamento multi-tenant
-- =========================================================

-- ---------------------------------------------------------
-- Helper: barbershop_id do usuário logado (via profiles)
-- ---------------------------------------------------------
create or replace function auth_barbershop_id()
returns uuid as $$
  select barbershop_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function auth_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

-- ---------------------------------------------------------
-- BARBERSHOPS
-- Leitura pública (necessária para a página pública), escrita
-- só pelo admin da própria barbearia.
-- ---------------------------------------------------------
alter table barbershops enable row level security;

create policy "barbershops_public_read" on barbershops
  for select using (true);

create policy "barbershops_admin_update" on barbershops
  for update using (id = auth_barbershop_id() and auth_role() = 'admin');

-- ---------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------
alter table profiles enable row level security;

create policy "profiles_self_read" on profiles
  for select using (id = auth.uid() or barbershop_id = auth_barbershop_id());

create policy "profiles_admin_manage" on profiles
  for all using (barbershop_id = auth_barbershop_id() and auth_role() = 'admin');

-- ---------------------------------------------------------
-- SERVICES — leitura pública (só ativos), escrita só do admin
-- ---------------------------------------------------------
alter table services enable row level security;

create policy "services_public_read" on services
  for select using (active = true);

create policy "services_staff_read_all" on services
  for select using (barbershop_id = auth_barbershop_id());

create policy "services_admin_write" on services
  for insert with check (barbershop_id = auth_barbershop_id() and auth_role() = 'admin');

create policy "services_admin_update" on services
  for update using (barbershop_id = auth_barbershop_id() and auth_role() = 'admin');

create policy "services_admin_delete" on services
  for delete using (barbershop_id = auth_barbershop_id() and auth_role() = 'admin');

-- ---------------------------------------------------------
-- BARBERS
-- ---------------------------------------------------------
alter table barbers enable row level security;

create policy "barbers_public_read" on barbers
  for select using (active = true);

create policy "barbers_staff_read_all" on barbers
  for select using (barbershop_id = auth_barbershop_id());

create policy "barbers_admin_write" on barbers
  for insert with check (barbershop_id = auth_barbershop_id() and auth_role() = 'admin');

create policy "barbers_admin_update" on barbers
  for update using (barbershop_id = auth_barbershop_id() and auth_role() = 'admin');

create policy "barbers_admin_delete" on barbers
  for delete using (barbershop_id = auth_barbershop_id() and auth_role() = 'admin');

-- ---------------------------------------------------------
-- BARBER_SERVICES
-- ---------------------------------------------------------
alter table barber_services enable row level security;

create policy "barber_services_public_read" on barber_services
  for select using (true);

create policy "barber_services_admin_write" on barber_services
  for all using (
    exists (select 1 from barbers b where b.id = barber_id and b.barbershop_id = auth_barbershop_id())
    and auth_role() = 'admin'
  );

-- ---------------------------------------------------------
-- WORKING_HOURS — leitura pública (necessária p/ calcular slots)
-- ---------------------------------------------------------
alter table working_hours enable row level security;

create policy "working_hours_public_read" on working_hours
  for select using (true);

create policy "working_hours_admin_write" on working_hours
  for all using (
    exists (select 1 from barbers b where b.id = barber_id and b.barbershop_id = auth_barbershop_id())
    and auth_role() = 'admin'
  );

-- ---------------------------------------------------------
-- BLOCKED_TIMES — leitura pública (necessária p/ calcular slots)
-- ---------------------------------------------------------
alter table blocked_times enable row level security;

create policy "blocked_times_public_read" on blocked_times
  for select using (true);

create policy "blocked_times_staff_write" on blocked_times
  for all using (barbershop_id = auth_barbershop_id());

-- ---------------------------------------------------------
-- CUSTOMERS — nunca público. Só staff/admin da própria barbearia.
-- A escrita pública acontece via função SECURITY DEFINER.
-- ---------------------------------------------------------
alter table customers enable row level security;

create policy "customers_staff_read" on customers
  for select using (barbershop_id = auth_barbershop_id());

create policy "customers_staff_write" on customers
  for update using (barbershop_id = auth_barbershop_id());

-- ---------------------------------------------------------
-- APPOINTMENTS — nunca público em leitura direta.
-- Criação pública acontece via create_public_appointment().
-- ---------------------------------------------------------
alter table appointments enable row level security;

create policy "appointments_staff_read" on appointments
  for select using (barbershop_id = auth_barbershop_id());

create policy "appointments_staff_update" on appointments
  for update using (barbershop_id = auth_barbershop_id());

create policy "appointments_admin_delete" on appointments
  for delete using (barbershop_id = auth_barbershop_id() and auth_role() = 'admin');

-- ---------------------------------------------------------
-- APPOINTMENT_STATUS_HISTORY
-- ---------------------------------------------------------
alter table appointment_status_history enable row level security;

create policy "status_history_staff_read" on appointment_status_history
  for select using (
    exists (
      select 1 from appointments a
      where a.id = appointment_id and a.barbershop_id = auth_barbershop_id()
    )
  );
