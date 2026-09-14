-- =========================================================
-- 0011_security_hardening.sql
-- 1) Fixa search_path em toda função SECURITY DEFINER (nenhuma
--    tinha isso definido — vetor clássico de search_path
--    hijacking: um objeto criado antes de "public" no search
--    path do usuário poderia sombrear tabelas/funções usadas
--    dentro dessas funções, escalando privilégio).
-- 2) notifications: barbeiro só via notificações dos próprios
--    agendamentos; admin/caixa mantêm visão completa da
--    barbearia (é quem realmente opera o balcão).
-- =========================================================

-- ---------- 1. search_path em todas as SECURITY DEFINER ----------
alter function auth_barbershop_id() set search_path = public, pg_temp;
alter function auth_role() set search_path = public, pg_temp;
alter function is_master() set search_path = public, pg_temp;
alter function redeem_invite(text, text) set search_path = public, pg_temp;
alter function get_invite_preview(text) set search_path = public, pg_temp;
alter function create_public_appointment(uuid, uuid, uuid, timestamptz, text, text, text) set search_path = public, pg_temp;
alter function create_customer_appointment(uuid, uuid, uuid, timestamptz, text, text) set search_path = public, pg_temp;
alter function cancel_own_appointment(uuid) set search_path = public, pg_temp;
alter function reschedule_own_appointment(uuid, timestamptz) set search_path = public, pg_temp;
alter function customer_owns_appointment(uuid) set search_path = public, pg_temp;
alter function barbeiro_has_appointment_with_customer(uuid) set search_path = public, pg_temp;

-- ---------- 2. notifications com menor privilégio ----------
drop policy if exists "notifications_staff_read" on notifications;
drop policy if exists "notifications_staff_update" on notifications;

create policy "notifications_admin_caixa_read" on notifications
  for select using (
    barbershop_id = auth_barbershop_id() and auth_role() in ('admin', 'caixa')
  );

create policy "notifications_admin_caixa_update" on notifications
  for update using (
    barbershop_id = auth_barbershop_id() and auth_role() in ('admin', 'caixa')
  );

create policy "notifications_barbeiro_read" on notifications
  for select using (
    auth_role() = 'barbeiro'
    and exists (
      select 1 from appointments a
      where a.id = notifications.appointment_id
        and a.barber_id = (select barber_id from profiles where id = auth.uid())
    )
  );

create policy "notifications_barbeiro_update" on notifications
  for update using (
    auth_role() = 'barbeiro'
    and exists (
      select 1 from appointments a
      where a.id = notifications.appointment_id
        and a.barber_id = (select barber_id from profiles where id = auth.uid())
    )
  );

-- ---------- 3. Estados finais são realmente finais ----------
-- Gap real encontrado: rescheduleAppointment (admin) só altera
-- starts_at/ends_at e nunca checava o status — dava pra "reabrir"
-- um agendamento já cancelled/completed/no_show só mudando o
-- horário, sem tocar no status. Trava no banco, não só no frontend.
create or replace function prevent_terminal_status_change()
returns trigger as $$
begin
  if old.status in ('completed', 'cancelled', 'no_show') then
    raise exception 'Este agendamento já está em um estado final (%) e não pode mais ser alterado.', old.status;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public, pg_temp;

drop trigger if exists trg_prevent_terminal_status_change on appointments;
create trigger trg_prevent_terminal_status_change
  before update on appointments
  for each row execute function prevent_terminal_status_change();

-- ---------- 4. índice ausente para a nova policy de barbeiro ----------
-- notifications_barbeiro_read/update filtram por appointment_id;
-- sem índice, cada checagem de RLS faz sequential scan.
create index if not exists idx_notifications_appointment on notifications(appointment_id);
