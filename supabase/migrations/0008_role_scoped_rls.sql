-- =========================================================
-- 0008_role_scoped_rls.sql
-- Correção de auditoria: as policies antigas tratavam admin,
-- caixa e barbeiro com o mesmo nível de acesso a "appointments"
-- e "customers" (qualquer staff da barbearia lia/editava tudo).
-- Isso permitia que um barbeiro, via chamada direta ao Supabase
-- (fora da tela, que já filtrava), lesse agendamentos e clientes
-- de outros profissionais. Esta migration substitui as policies
-- antigas por versões com escopo por papel.
-- =========================================================

-- ---------------------------------------------------------
-- APPOINTMENTS
-- ---------------------------------------------------------
drop policy if exists "appointments_staff_read" on appointments;
drop policy if exists "appointments_staff_update" on appointments;

-- admin e caixa: leitura/atualização de todos os agendamentos da própria barbearia
create policy "appointments_admin_caixa_read" on appointments
  for select using (
    barbershop_id = auth_barbershop_id() and auth_role() in ('admin', 'caixa')
  );

create policy "appointments_admin_caixa_update" on appointments
  for update using (
    barbershop_id = auth_barbershop_id() and auth_role() in ('admin', 'caixa')
  );

-- barbeiro: só os próprios agendamentos
create policy "appointments_barbeiro_read" on appointments
  for select using (
    barbershop_id = auth_barbershop_id()
    and auth_role() = 'barbeiro'
    and barber_id = (select barber_id from profiles where id = auth.uid())
  );

create policy "appointments_barbeiro_update" on appointments
  for update using (
    barbershop_id = auth_barbershop_id()
    and auth_role() = 'barbeiro'
    and barber_id = (select barber_id from profiles where id = auth.uid())
  );

-- ---------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------
drop policy if exists "customers_staff_read" on customers;
drop policy if exists "customers_staff_write" on customers;

-- admin e caixa: acesso completo aos clientes da própria barbearia
create policy "customers_admin_caixa_read" on customers
  for select using (
    barbershop_id = auth_barbershop_id() and auth_role() in ('admin', 'caixa')
  );

create policy "customers_admin_caixa_write" on customers
  for update using (
    barbershop_id = auth_barbershop_id() and auth_role() in ('admin', 'caixa')
  );

-- barbeiro: só os clientes com quem ele tem agendamento
create policy "customers_barbeiro_read" on customers
  for select using (
    auth_role() = 'barbeiro'
    and exists (
      select 1 from appointments a
      where a.customer_id = customers.id
        and a.barber_id = (select barber_id from profiles where id = auth.uid())
    )
  );
