-- =========================================================
-- 0006_accounts_functions.sql
-- Funções: master, convites, agendamento pelo cliente logado,
-- cancelamento/remarcação pelo próprio cliente, notificações
-- =========================================================

-- ---------------------------------------------------------
-- Helper: usuário atual é o master do sistema?
-- ---------------------------------------------------------
create or replace function is_master()
returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'master');
$$ language sql stable security definer;

-- ---------------------------------------------------------
-- Resgatar um convite (admin/caixa/barbeiro se autocadastrando)
-- Precisa ser chamado logo após o supabase.auth.signUp() do
-- próprio convidado, autenticado.
-- ---------------------------------------------------------
create or replace function redeem_invite(p_token text, p_full_name text)
returns void as $$
declare
  v_invite invites%rowtype;
  v_uid uuid := auth.uid();
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

  insert into profiles (id, barbershop_id, role, full_name, barber_id)
  values (v_uid, v_invite.barbershop_id, v_invite.role, p_full_name, v_invite.barber_id)
  on conflict (id) do update
    set barbershop_id = excluded.barbershop_id,
        role = excluded.role,
        full_name = excluded.full_name,
        barber_id = excluded.barber_id;

  update invites set used = true, used_by = v_uid where id = v_invite.id;
end;
$$ language plpgsql security definer;

revoke all on function redeem_invite from public;
grant execute on function redeem_invite to authenticated;

-- ---------------------------------------------------------
-- Pré-visualizar um convite pelo token, sem precisar de login
-- e sem expor a lista completa de convites (RLS bloqueia
-- select direto na tabela "invites" para usuários anônimos).
-- ---------------------------------------------------------
create or replace function get_invite_preview(p_token text)
returns table (barbershop_name text, role text, email text) as $$
  select b.name, i.role, i.email
  from invites i
  join barbershops b on b.id = i.barbershop_id
  where i.token = p_token and not i.used and i.expires_at > now();
$$ language sql stable security definer;

revoke all on function get_invite_preview from public;
grant execute on function get_invite_preview to anon, authenticated;

-- ---------------------------------------------------------
-- Criar agendamento como cliente autenticado
-- (substitui o antigo create_public_appointment: agora exige login)
-- ---------------------------------------------------------
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
begin
  if v_uid is null then
    raise exception 'É necessário estar logado para agendar.';
  end if;

  select duration_minutes, price_cents into v_duration, v_price
  from services where id = p_service_id and barbershop_id = p_barbershop_id and active;

  if v_duration is null then
    raise exception 'Serviço inválido ou inativo';
  end if;

  if not exists (select 1 from barbershops where id = p_barbershop_id and active) then
    raise exception 'Esta barbearia está temporariamente indisponível para agendamentos.';
  end if;

  v_ends_at := p_starts_at + (v_duration || ' minutes')::interval;

  insert into customers (barbershop_id, auth_user_id, name, whatsapp)
  values (p_barbershop_id, v_uid, p_customer_name, p_customer_whatsapp)
  on conflict (barbershop_id, auth_user_id) where auth_user_id is not null
  do update set name = excluded.name, whatsapp = excluded.whatsapp
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
$$ language plpgsql security definer;

revoke all on function create_customer_appointment from public;
grant execute on function create_customer_appointment to authenticated;

-- a criação pública antiga não é mais usada pelo novo fluxo
-- (mantida no banco por compatibilidade, mas sem acesso anônimo)
revoke execute on function create_public_appointment from anon;

-- ---------------------------------------------------------
-- Cliente cancela o próprio agendamento
-- ---------------------------------------------------------
create or replace function cancel_own_appointment(p_appointment_id uuid)
returns void as $$
declare
  v_uid uuid := auth.uid();
  v_match uuid;
begin
  if v_uid is null then
    raise exception 'Faça login para gerenciar seus agendamentos.';
  end if;

  select a.id into v_match
  from appointments a
  join customers c on c.id = a.customer_id
  where a.id = p_appointment_id and c.auth_user_id = v_uid
    and a.status not in ('cancelled', 'completed', 'no_show');

  if v_match is null then
    raise exception 'Agendamento não encontrado ou não pode mais ser cancelado.';
  end if;

  update appointments set status = 'cancelled' where id = p_appointment_id;
end;
$$ language plpgsql security definer;

revoke all on function cancel_own_appointment from public;
grant execute on function cancel_own_appointment to authenticated;

-- ---------------------------------------------------------
-- Cliente remarca o próprio agendamento
-- ---------------------------------------------------------
create or replace function reschedule_own_appointment(p_appointment_id uuid, p_new_starts_at timestamptz)
returns void as $$
declare
  v_uid uuid := auth.uid();
  v_service_id uuid;
  v_duration int;
  v_new_ends timestamptz;
  v_match uuid;
begin
  if v_uid is null then
    raise exception 'Faça login para gerenciar seus agendamentos.';
  end if;

  select a.id, a.service_id into v_match, v_service_id
  from appointments a
  join customers c on c.id = a.customer_id
  where a.id = p_appointment_id and c.auth_user_id = v_uid
    and a.status not in ('cancelled', 'completed', 'no_show');

  if v_match is null then
    raise exception 'Agendamento não encontrado ou não pode mais ser remarcado.';
  end if;

  select duration_minutes into v_duration from services where id = v_service_id;
  v_new_ends := p_new_starts_at + (v_duration || ' minutes')::interval;

  update appointments
  set starts_at = p_new_starts_at, ends_at = v_new_ends, status = 'pending'
  where id = p_appointment_id;
exception
  when exclusion_violation then
    raise exception 'Este novo horário já foi reservado. Escolha outro.';
end;
$$ language plpgsql security definer;

revoke all on function reschedule_own_appointment from public;
grant execute on function reschedule_own_appointment to authenticated;

-- ---------------------------------------------------------
-- Notificações automáticas para a equipe da barbearia
-- ---------------------------------------------------------
create or replace function notify_appointment_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications (barbershop_id, appointment_id, type, message)
    values (new.barbershop_id, new.id, 'new', 'Novo agendamento recebido.');
  elsif tg_op = 'UPDATE' then
    if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      insert into notifications (barbershop_id, appointment_id, type, message)
      values (new.barbershop_id, new.id, 'cancelled', 'Um agendamento foi cancelado.');
    elsif new.starts_at <> old.starts_at then
      insert into notifications (barbershop_id, appointment_id, type, message)
      values (new.barbershop_id, new.id, 'rescheduled', 'Um agendamento foi remarcado.');
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_notify_appointment on appointments;
create trigger trg_notify_appointment
  after insert or update on appointments
  for each row execute function notify_appointment_change();
