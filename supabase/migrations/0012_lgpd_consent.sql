-- =========================================================
-- 0012_lgpd_consent.sql
-- Base técnica de LGPD: registro de consentimento (quando e
-- qual versão dos termos foi aceita) e direito de exclusão
-- (anonimização) dos próprios dados pelo titular.
--
-- Isso NÃO substitui assessoria jurídica — é a base técnica
-- (colunas + funções) para sustentar a Política de Privacidade
-- e os Termos de Uso publicados no frontend.
-- =========================================================

-- ---------- 1. Colunas de consentimento ----------
alter table customers add column if not exists privacy_accepted_at timestamptz;
alter table customers add column if not exists privacy_policy_version text;

alter table profiles add column if not exists privacy_accepted_at timestamptz;
alter table profiles add column if not exists privacy_policy_version text;

-- ---------- 2. Captura o consentimento dado no cadastro ----------
-- O cliente aceita os termos no formulário de cadastro (frontend),
-- e isso é gravado em auth.users.raw_user_meta_data no momento do
-- signUp (mesmo padrão já usado para full_name/phone). Assim que o
-- cliente faz o primeiro agendamento — quando a linha em "customers"
-- é criada pela primeira vez — gravamos o consentimento nela também,
-- de forma durável e consultável pela barbearia.
create or replace function create_customer_appointment(
  p_barbershop_id uuid,
  p_barber_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_whatsapp text
)
returns table (appointment_id uuid, appointment_code text) as $$
declare
  v_uid uuid := auth.uid();
  v_duration int;
  v_price int;
  v_ends_at timestamptz;
  v_customer_id uuid;
  v_code text;
  v_appointment_id uuid;
  v_consent_at timestamptz;
  v_consent_version text;
begin
  if v_uid is null then
    raise exception 'É necessário estar logado para agendar.';
  end if;

  if not exists (select 1 from barbershops where id = p_barbershop_id and active) then
    raise exception 'Esta barbearia está temporariamente indisponível para agendamentos.';
  end if;

  select duration_minutes, price_cents into v_duration, v_price
  from services
  where id = p_service_id and barbershop_id = p_barbershop_id and active;

  if v_duration is null then
    raise exception 'Serviço inválido ou inativo';
  end if;

  if not exists (
    select 1 from barbers where id = p_barber_id and barbershop_id = p_barbershop_id and active
  ) then
    raise exception 'Profissional inválido para esta barbearia.';
  end if;

  if not exists (
    select 1 from barber_services where barber_id = p_barber_id and service_id = p_service_id
  ) then
    raise exception 'Este profissional não realiza o serviço selecionado.';
  end if;

  v_ends_at := p_starts_at + (v_duration || ' minutes')::interval;

  select
    nullif(raw_user_meta_data->>'accepted_terms_at', '')::timestamptz,
    nullif(raw_user_meta_data->>'accepted_terms_version', '')
  into v_consent_at, v_consent_version
  from auth.users where id = v_uid;

  insert into customers (barbershop_id, auth_user_id, name, whatsapp, privacy_accepted_at, privacy_policy_version)
  values (p_barbershop_id, v_uid, p_customer_name, p_customer_whatsapp, v_consent_at, v_consent_version)
  on conflict (barbershop_id, auth_user_id) where auth_user_id is not null
  do update set
    name = excluded.name,
    whatsapp = excluded.whatsapp,
    privacy_accepted_at = coalesce(customers.privacy_accepted_at, excluded.privacy_accepted_at),
    privacy_policy_version = coalesce(customers.privacy_policy_version, excluded.privacy_policy_version)
  returning id into v_customer_id;

  v_code := generate_appointment_code();

  insert into appointments (
    barbershop_id, barber_id, service_id, customer_id,
    starts_at, ends_at, status, code, price_cents
  ) values (
    p_barbershop_id, p_barber_id, p_service_id, v_customer_id,
    p_starts_at, v_ends_at, 'pending', v_code, v_price
  )
  returning id into v_appointment_id;

  return query select v_appointment_id, v_code;
exception
  when exclusion_violation then
    raise exception 'Este horário acabou de ser reservado por outro cliente. Escolha outro horário.';
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke all on function create_customer_appointment from public;
grant execute on function create_customer_appointment to authenticated;

-- ---------- 3. Mesma captura de consentimento para convites de equipe ----------
create or replace function redeem_invite(p_token text, p_full_name text)
returns void as $$
declare
  v_invite invites%rowtype;
  v_uid uuid := auth.uid();
  v_consent_at timestamptz;
  v_consent_version text;
begin
  if v_uid is null then
    raise exception 'É necessário estar logado para usar o convite.';
  end if;

  select * into v_invite from invites
  where token = p_token and not used and expires_at > now()
  for update;

  if v_invite.id is null then
    raise exception 'Convite inválido ou expirado.';
  end if;

  select
    nullif(raw_user_meta_data->>'accepted_terms_at', '')::timestamptz,
    nullif(raw_user_meta_data->>'accepted_terms_version', '')
  into v_consent_at, v_consent_version
  from auth.users where id = v_uid;

  insert into profiles (id, barbershop_id, role, full_name, barber_id, privacy_accepted_at, privacy_policy_version)
  values (v_uid, v_invite.barbershop_id, v_invite.role, p_full_name, v_invite.barber_id, v_consent_at, v_consent_version)
  on conflict (id) do update
    set barbershop_id = excluded.barbershop_id,
        role = excluded.role,
        full_name = excluded.full_name,
        barber_id = excluded.barber_id,
        privacy_accepted_at = coalesce(profiles.privacy_accepted_at, excluded.privacy_accepted_at),
        privacy_policy_version = coalesce(profiles.privacy_policy_version, excluded.privacy_policy_version);

  update invites set used = true, used_by = v_uid where id = v_invite.id;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke all on function redeem_invite from public;
grant execute on function redeem_invite to authenticated;

-- ---------- 4. Direito de exclusão (anonimização) ----------
-- Não é possível apagar a conta de autenticação (auth.users) sem a
-- service_role key, que nunca roda no frontend — isso fica registrado
-- como limitação técnica conhecida (documentada no app). O que esta
-- função faz, e que É seguro fazer com a anon key: anonimiza os dados
-- pessoais do cliente em TODAS as barbearias onde ele tem cadastro,
-- preservando os agendamentos (a barbearia tem base legal própria —
-- obrigação fiscal/contratual — para manter o histórico transacional,
-- só não mais associado a dados pessoais identificáveis).
create or replace function request_customer_data_deletion()
returns void as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'É necessário estar logado.';
  end if;

  update customers
  set name = 'Cliente removido',
      whatsapp = '',
      email = null,
      auth_user_id = null
  where auth_user_id = v_uid;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke all on function request_customer_data_deletion from public;
grant execute on function request_customer_data_deletion to authenticated;
