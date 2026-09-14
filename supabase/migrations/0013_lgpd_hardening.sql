-- =========================================================
-- 0013_lgpd_hardening.sql
-- Auditoria encontrou 2 problemas reais:
--
-- 1) create_customer_appointment/redeem_invite confiavam em
--    accepted_terms_at/accepted_terms_version vindos direto de
--    auth.users.raw_user_meta_data (definido pelo PRÓPRIO cliente
--    no signUp) — um valor forjável, tanto a data quanto a versão.
--    Além disso, nada exigia que o consentimento existisse.
--    Correção: o servidor não confia mais em data/versão do
--    cliente — só em um booleano "accepted_terms = true" (o menor
--    sinal possível de confiar), e grava ele mesmo now() e a
--    versão vigente (hardcoded no banco). Sem o booleano, a ação
--    (agendar / entrar na equipe) é bloqueada.
--
-- 2) customers_admin_caixa_write (0003) permite UPDATE de
--    qualquer coluna da própria barbearia — incluindo
--    privacy_accepted_at, privacy_policy_version e auth_user_id.
--    Um caixa/admin mal-intencionado poderia reescrever o
--    consentimento de um cliente, ou pior, reatribuir
--    auth_user_id para o próprio uid e "sequestrar" o histórico
--    de outro cliente. Correção: revoga privilégio de UPDATE
--    nessas colunas especificamente para anon/authenticated — só
--    as funções SECURITY DEFINER (donas da tabela) continuam
--    conseguindo escrever nelas.
-- =========================================================

-- ---------- 0. Versão vigente dos termos, definida no servidor ----------
create or replace function current_terms_version()
returns text as $$
  select 'v1-2026-09'::text;
$$ language sql immutable set search_path = public, pg_temp;

-- ---------- 1. create_customer_appointment endurecida ----------
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
  v_gave_consent boolean;
begin
  if v_uid is null then
    raise exception 'É necessário estar logado para agendar.';
  end if;

  select (raw_user_meta_data->>'accepted_terms') = 'true' into v_gave_consent
  from auth.users where id = v_uid;

  if not coalesce(v_gave_consent, false) then
    raise exception 'É necessário aceitar os Termos de Uso e a Política de Privacidade para agendar.';
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

  insert into customers (barbershop_id, auth_user_id, name, whatsapp, privacy_accepted_at, privacy_policy_version)
  values (p_barbershop_id, v_uid, p_customer_name, p_customer_whatsapp, now(), current_terms_version())
  on conflict (barbershop_id, auth_user_id) where auth_user_id is not null
  do update set
    name = excluded.name,
    whatsapp = excluded.whatsapp,
    -- nunca sobrescreve um consentimento já registrado — só preenche se estava vazio
    privacy_accepted_at = coalesce(customers.privacy_accepted_at, now()),
    privacy_policy_version = coalesce(customers.privacy_policy_version, current_terms_version())
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

-- ---------- 2. redeem_invite endurecida ----------
create or replace function redeem_invite(p_token text, p_full_name text)
returns void as $$
declare
  v_invite invites%rowtype;
  v_uid uuid := auth.uid();
  v_gave_consent boolean;
begin
  if v_uid is null then
    raise exception 'É necessário estar logado para usar o convite.';
  end if;

  select (raw_user_meta_data->>'accepted_terms') = 'true' into v_gave_consent
  from auth.users where id = v_uid;

  if not coalesce(v_gave_consent, false) then
    raise exception 'É necessário aceitar os Termos de Uso e a Política de Privacidade para continuar.';
  end if;

  select * into v_invite from invites
  where token = p_token and not used and expires_at > now()
  for update;

  if v_invite.id is null then
    raise exception 'Convite inválido ou expirado.';
  end if;

  insert into profiles (id, barbershop_id, role, full_name, barber_id, privacy_accepted_at, privacy_policy_version)
  values (v_uid, v_invite.barbershop_id, v_invite.role, p_full_name, v_invite.barber_id, now(), current_terms_version())
  on conflict (id) do update
    set barbershop_id = excluded.barbershop_id,
        role = excluded.role,
        full_name = excluded.full_name,
        barber_id = excluded.barber_id,
        privacy_accepted_at = coalesce(profiles.privacy_accepted_at, now()),
        privacy_policy_version = coalesce(profiles.privacy_policy_version, current_terms_version());

  update invites set used = true, used_by = v_uid where id = v_invite.id;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke all on function redeem_invite from public;
grant execute on function redeem_invite to authenticated;

-- ---------- 3. Colunas sensíveis só graváveis pelas funções donas da tabela ----------
-- Um REVOKE por coluna NÃO seria suficiente aqui: o GRANT ALL de nível
-- de tabela (concedido por padrão a anon/authenticated) autoriza UPDATE
-- em qualquer coluna independentemente de um REVOKE mais específico por
-- coluna — os dois são checados de forma independente no Postgres.
-- Como nenhum fluxo do frontend faz UPDATE direto em "customers" ou
-- "profiles" (toda escrita passa pelas funções SECURITY DEFINER acima,
-- que rodam como dona da tabela e por isso não são afetadas por este
-- REVOKE), é seguro revogar UPDATE de nível de tabela por completo.
revoke update on customers from authenticated, anon;
revoke update on profiles from authenticated, anon;
