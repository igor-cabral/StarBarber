-- =========================================================
-- 0001_schema.sql
-- Schema principal do sistema de agendamento (multi-tenant)
-- =========================================================

create extension if not exists "uuid-ossp";
create extension if not exists btree_gist; -- necessário para EXCLUDE USING gist

-- ---------------------------------------------------------
-- BARBERSHOPS (tenant raiz)
-- ---------------------------------------------------------
create table barbershops (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  tagline text,
  logo_url text,
  description text,
  phone text,
  whatsapp text,
  instagram text,
  address text,
  color_ink text not null default '#111111',
  color_graphite text not null default '#71717A',
  color_paper text not null default '#FFFFFF',
  color_accent text not null default '#C89B3C',
  min_minutes_between_appointments int not null default 0,
  cancellation_policy text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- PROFILES (usuários administrativos, ligados ao auth.users)
-- ---------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  full_name text,
  barber_id uuid, -- se role = staff, referencia o registro em "barbers" (FK adicionada depois)
  created_at timestamptz not null default now()
);

create index idx_profiles_barbershop on profiles(barbershop_id);

-- ---------------------------------------------------------
-- SERVICES
-- ---------------------------------------------------------
create table services (
  id uuid primary key default uuid_generate_v4(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_services_barbershop on services(barbershop_id) where active;

-- ---------------------------------------------------------
-- BARBERS
-- ---------------------------------------------------------
create table barbers (
  id uuid primary key default uuid_generate_v4(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  name text not null,
  photo_url text,
  description text,
  specialties text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_barbers_barbershop on barbers(barbershop_id) where active;

alter table profiles
  add constraint fk_profiles_barber foreign key (barber_id) references barbers(id) on delete set null;

-- ---------------------------------------------------------
-- BARBER_SERVICES (N:N)
-- ---------------------------------------------------------
create table barber_services (
  barber_id uuid not null references barbers(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  primary key (barber_id, service_id)
);

-- ---------------------------------------------------------
-- WORKING_HOURS (expediente semanal recorrente por profissional)
-- ---------------------------------------------------------
create table working_hours (
  id uuid primary key default uuid_generate_v4(),
  barber_id uuid not null references barbers(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  break_start_time time,
  break_end_time time,
  check (end_time > start_time)
);

create index idx_working_hours_barber on working_hours(barber_id, weekday);

-- ---------------------------------------------------------
-- BLOCKED_TIMES (folga, férias, bloqueio pontual, feriado)
-- ---------------------------------------------------------
create table blocked_times (
  id uuid primary key default uuid_generate_v4(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  barber_id uuid references barbers(id) on delete cascade, -- null = bloqueio para a barbearia toda (feriado)
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at)
);

create index idx_blocked_times_barber on blocked_times(barber_id, starts_at, ends_at);

-- ---------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------
create table customers (
  id uuid primary key default uuid_generate_v4(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  name text not null,
  whatsapp text not null,
  email text,
  created_at timestamptz not null default now(),
  unique (barbershop_id, whatsapp)
);

create index idx_customers_barbershop on customers(barbershop_id);

-- ---------------------------------------------------------
-- APPOINTMENTS
-- ---------------------------------------------------------
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  barber_id uuid not null references barbers(id),
  service_id uuid not null references services(id),
  customer_id uuid not null references customers(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','in_progress','completed','cancelled','no_show')),
  code text not null unique, -- ex: AGD-8F42K
  price_cents integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Impede DOIS agendamentos sobrepostos para o MESMO profissional,
  -- exceto quando o agendamento está cancelado/não compareceu.
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status not in ('cancelled', 'no_show'))
);

create index idx_appointments_barbershop_date on appointments(barbershop_id, starts_at);
create index idx_appointments_barber_date on appointments(barber_id, starts_at);
create index idx_appointments_customer on appointments(customer_id);

-- ---------------------------------------------------------
-- APPOINTMENT_STATUS_HISTORY
-- ---------------------------------------------------------
create table appointment_status_history (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  status text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id)
);

create index idx_status_history_appointment on appointment_status_history(appointment_id);

-- ---------------------------------------------------------
-- TRIGGERS: updated_at automático
-- ---------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_barbershops_updated_at before update on barbershops
  for each row execute function set_updated_at();

create trigger trg_appointments_updated_at before update on appointments
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- TRIGGER: registrar histórico de status automaticamente
-- ---------------------------------------------------------
create or replace function log_appointment_status_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') or (old.status is distinct from new.status) then
    insert into appointment_status_history (appointment_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_log_appointment_status
  after insert or update on appointments
  for each row execute function log_appointment_status_change();
