-- =========================================================
-- 0009_appointment_integrity.sql
-- Correção de auditoria: create_customer_appointment confiava
-- que barber_id, service_id e barbershop_id enviados pelo
-- cliente eram consistentes entre si. Um cliente malicioso
-- poderia combinar um barber_id de uma barbearia com o
-- barbershop_id/service_id de outra. Esta migration substitui
-- a função validando a consistência inteira no banco.
-- =========================================================

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

  if not exists (select 1 from barbershops where id = p_barbershop_id and active) then
    raise exception 'Esta barbearia está temporariamente indisponível para agendamentos.';
  end if;

  -- o serviço precisa pertencer exatamente a essa barbearia
  select duration_minutes, price_cents into v_duration, v_price
  from services
  where id = p_service_id and barbershop_id = p_barbershop_id and active;

  if v_duration is null then
    raise exception 'Serviço inválido ou inativo';
  end if;

  -- o profissional também precisa pertencer a essa barbearia...
  if not exists (
    select 1 from barbers where id = p_barber_id and barbershop_id = p_barbershop_id and active
  ) then
    raise exception 'Profissional inválido para esta barbearia.';
  end if;

  -- ...e realizar esse serviço especificamente
  if not exists (
    select 1 from barber_services where barber_id = p_barber_id and service_id = p_service_id
  ) then
    raise exception 'Este profissional não realiza o serviço selecionado.';
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
