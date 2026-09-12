-- =========================================================
-- 0002_functions.sql
-- Funções de apoio: código do agendamento e disponibilidade
-- =========================================================

-- ---------------------------------------------------------
-- Gera um código curto único no formato AGD-XXXXX
-- ---------------------------------------------------------
create or replace function generate_appointment_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sem O/0/I/1 (evita confusão)
  result text := 'AGD-';
  i int;
begin
  for i in 1..5 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- ---------------------------------------------------------
-- Retorna os slots de horário disponíveis de um profissional
-- para um serviço (duração) em uma data específica.
--
-- Considera: expediente do dia, intervalo de almoço,
-- bloqueios pontuais/folgas, agendamentos já existentes,
-- e o intervalo mínimo entre atendimentos da barbearia.
-- ---------------------------------------------------------
create or replace function get_available_slots(
  p_barber_id uuid,
  p_service_id uuid,
  p_date date
)
returns table (slot_start timestamptz, slot_end timestamptz) as $$
declare
  v_duration int;
  v_buffer int;
  v_weekday int := extract(dow from p_date);
  v_tz text := 'America/Sao_Paulo';
begin
  select duration_minutes into v_duration from services where id = p_service_id;
  select min_minutes_between_appointments into v_buffer
    from barbershops b join barbers br on br.barbershop_id = b.id
    where br.id = p_barber_id;

  return query
  with hours as (
    select wh.start_time, wh.end_time, wh.break_start_time, wh.break_end_time
    from working_hours wh
    where wh.barber_id = p_barber_id and wh.weekday = v_weekday
  ),
  raw_slots as (
    select
      (p_date::timestamp + h.start_time) at time zone v_tz
        + (n || ' minutes')::interval as s_start
    from hours h,
      generate_series(
        0,
        (extract(epoch from (h.end_time - h.start_time)) / 60)::int - v_duration,
        greatest(v_duration, 5) -- passo do slot = duração do serviço
      ) as n
  ),
  candidate as (
    select s_start, s_start + (v_duration || ' minutes')::interval as s_end
    from raw_slots
  ),
  filtered as (
    select c.s_start, c.s_end
    from candidate c
    join hours h on true
    where
      -- não cair dentro do intervalo de almoço
      (h.break_start_time is null or
        not ( (c.s_start::time, c.s_end::time) overlaps (h.break_start_time, h.break_end_time) ))
      -- não conflitar com bloqueios (folga, férias, feriado)
      and not exists (
        select 1 from blocked_times bt
        where (bt.barber_id = p_barber_id or bt.barber_id is null)
          and tstzrange(bt.starts_at, bt.ends_at) && tstzrange(c.s_start, c.s_end)
      )
      -- não conflitar com agendamentos existentes (+ buffer entre atendimentos)
      and not exists (
        select 1 from appointments a
        where a.barber_id = p_barber_id
          and a.status not in ('cancelled', 'no_show')
          and tstzrange(a.starts_at - (v_buffer || ' minutes')::interval,
                      a.ends_at + (v_buffer || ' minutes')::interval)
              && tstzrange(c.s_start, c.s_end)
      )
      -- não oferecer horário no passado
      and c.s_start > now()
  )
  select s_start, s_end from filtered order by s_start;
end;
$$ language plpgsql stable;

-- ---------------------------------------------------------
-- Cria um agendamento de forma atômica (valida e insere).
-- SECURITY DEFINER para permitir que o público (anon) agende
-- sem precisar de policies de insert abertas em todas as tabelas.
-- A constraint EXCLUDE em "appointments" é a garantia final
-- contra condição de corrida.
-- ---------------------------------------------------------
create or replace function create_public_appointment(
  p_barbershop_id uuid,
  p_barber_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_whatsapp text,
  p_customer_email text
)
returns table (appointment_id uuid, appointment_code text) as $$
declare
  v_duration int;
  v_price int;
  v_ends_at timestamptz;
  v_customer_id uuid;
  v_code text;
  v_appointment_id uuid;
begin
  select duration_minutes, price_cents into v_duration, v_price
  from services where id = p_service_id and barbershop_id = p_barbershop_id and active;

  if v_duration is null then
    raise exception 'Serviço inválido ou inativo';
  end if;

  v_ends_at := p_starts_at + (v_duration || ' minutes')::interval;

  -- upsert do cliente por whatsapp dentro da barbearia
  insert into customers (barbershop_id, name, whatsapp, email)
  values (p_barbershop_id, p_customer_name, p_customer_whatsapp, nullif(p_customer_email, ''))
  on conflict (barbershop_id, whatsapp)
  do update set name = excluded.name, email = coalesce(excluded.email, customers.email)
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

revoke all on function create_public_appointment from public;
grant execute on function create_public_appointment to anon, authenticated;
grant execute on function get_available_slots to anon, authenticated;
