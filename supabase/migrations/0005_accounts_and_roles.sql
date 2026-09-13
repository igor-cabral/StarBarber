-- =========================================================
-- 0005_accounts_and_roles.sql
-- Papéis expandidos, bloqueio de barbearia e login de clientes
-- =========================================================

-- ---------------------------------------------------------
-- BARBERSHOPS: campo de bloqueio (usado pelo usuário master)
-- ---------------------------------------------------------
alter table barbershops add column if not exists active boolean not null default true;

-- ---------------------------------------------------------
-- PROFILES: novos papéis e suporte ao usuário master
-- (master não pertence a nenhuma barbearia)
-- ---------------------------------------------------------
alter table profiles drop constraint if exists profiles_role_check;

-- migra o papel genérico "staff" para os novos papéis específicos
update profiles set role = 'barbeiro' where role = 'staff' and barber_id is not null;
update profiles set role = 'caixa' where role = 'staff' and barber_id is null;

alter table profiles alter column barbershop_id drop not null;

alter table profiles add constraint profiles_role_check
  check (role in ('master', 'admin', 'caixa', 'barbeiro'));

alter table profiles add constraint profiles_shop_consistency check (
  (role = 'master' and barbershop_id is null) or
  (role <> 'master' and barbershop_id is not null)
);

-- ---------------------------------------------------------
-- CUSTOMERS: agora vinculado a uma conta de autenticação
-- ---------------------------------------------------------
alter table customers drop constraint if exists customers_barbershop_id_whatsapp_key;

alter table customers add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists customers_barbershop_authuser_uidx
  on customers(barbershop_id, auth_user_id) where auth_user_id is not null;

-- ---------------------------------------------------------
-- NOTIFICATIONS: avisos para a equipe (novo agendamento,
-- cancelamento, remarcação feita pelo cliente)
-- ---------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  type text not null check (type in ('new', 'cancelled', 'rescheduled')),
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_shop on notifications(barbershop_id, read, created_at desc);

-- ---------------------------------------------------------
-- INVITES: convites para admin/caixa/barbeiro se cadastrarem
-- sem precisar de senha de administrador do Supabase
-- ---------------------------------------------------------
create table if not exists invites (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique default replace(uuid_generate_v4()::text, '-', ''),
  email text,
  role text not null check (role in ('admin', 'caixa', 'barbeiro')),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  barber_id uuid references barbers(id) on delete set null,
  full_name text,
  used boolean not null default false,
  used_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

create index if not exists idx_invites_token on invites(token) where not used;
