-- =========================================================
-- 0007_accounts_rls.sql
-- RLS: usuário master (acesso total), clientes autenticados
-- (leitura/gestão dos próprios agendamentos), convites,
-- notificações e bloqueio de barbearia
-- =========================================================

-- ---------------------------------------------------------
-- MASTER: acesso irrestrito a todas as tabelas do sistema
-- (políticas adicionais — permissivas, então se somam às
-- políticas de tenant já existentes sem enfraquecê-las)
-- ---------------------------------------------------------
create policy "barbershops_master_all" on barbershops for all using (is_master());
create policy "profiles_master_all" on profiles for all using (is_master());
create policy "services_master_all" on services for all using (is_master());
create policy "barbers_master_all" on barbers for all using (is_master());
create policy "barber_services_master_all" on barber_services for all using (is_master());
create policy "working_hours_master_all" on working_hours for all using (is_master());
create policy "blocked_times_master_all" on blocked_times for all using (is_master());
create policy "customers_master_all" on customers for all using (is_master());
create policy "appointments_master_all" on appointments for all using (is_master());
create policy "status_history_master_all" on appointment_status_history for all using (is_master());

-- ---------------------------------------------------------
-- CUSTOMERS: cliente autenticado enxerga o próprio cadastro
-- ---------------------------------------------------------
create policy "customers_self_read" on customers
  for select using (auth_user_id = auth.uid());

-- ---------------------------------------------------------
-- APPOINTMENTS: cliente autenticado enxerga o próprio
-- histórico. Cancelar/remarcar acontece só via função
-- SECURITY DEFINER (validação extra e sem exposta a alterar
-- outros campos livremente).
-- ---------------------------------------------------------
create policy "appointments_customer_read" on appointments
  for select using (
    exists (
      select 1 from customers c
      where c.id = appointments.customer_id and c.auth_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------
alter table notifications enable row level security;

create policy "notifications_staff_read" on notifications
  for select using (barbershop_id = auth_barbershop_id());

create policy "notifications_staff_update" on notifications
  for update using (barbershop_id = auth_barbershop_id());

create policy "notifications_master_all" on notifications for all using (is_master());

-- ---------------------------------------------------------
-- INVITES
-- admin cria convites de caixa/barbeiro para a própria barbearia;
-- master cria convites de qualquer papel para qualquer barbearia.
-- ---------------------------------------------------------
alter table invites enable row level security;

create policy "invites_admin_manage" on invites
  for all using (
    barbershop_id = auth_barbershop_id() and auth_role() = 'admin' and role in ('caixa', 'barbeiro')
  ) with check (
    barbershop_id = auth_barbershop_id() and auth_role() = 'admin' and role in ('caixa', 'barbeiro')
  );

create policy "invites_master_all" on invites for all using (is_master());
