-- =========================================================
-- 0010_fix_rls_recursion.sql
-- BUG CRÍTICO encontrado em teste de integração real:
-- "infinite recursion detected in policy for relation appointments"
--
-- Causa: appointments_customer_read consulta "customers" dentro do
-- USING, e customers_barbeiro_read consulta "appointments" dentro
-- do USING. RLS de uma tabela reavalia RLS da outra referenciada,
-- e como as duas se referenciam mutuamente, vira um loop infinito.
-- Isso quebrava leitura de "appointments" para QUALQUER papel
-- autenticado (admin, caixa, barbeiro, cliente) assim que ambas as
-- policies existiam ao mesmo tempo no banco.
--
-- Correção: mover as subconsultas cruzadas para dentro de funções
-- SECURITY DEFINER (mesmo padrão já usado em auth_role()/
-- is_master()). Como essas funções rodam com o privilégio do dono
-- (postgres), as consultas internas NÃO reativam o RLS da tabela
-- consultada — quebrando o ciclo.
-- =========================================================

create or replace function customer_owns_appointment(p_customer_id uuid)
returns boolean as $$
  select exists (
    select 1 from customers c where c.id = p_customer_id and c.auth_user_id = auth.uid()
  );
$$ language sql stable security definer;

create or replace function barbeiro_has_appointment_with_customer(p_customer_id uuid)
returns boolean as $$
  select exists (
    select 1 from appointments a
    where a.customer_id = p_customer_id
      and a.barber_id = (select barber_id from profiles where id = auth.uid())
  );
$$ language sql stable security definer;

drop policy if exists "appointments_customer_read" on appointments;
create policy "appointments_customer_read" on appointments
  for select using (customer_owns_appointment(customer_id));

drop policy if exists "customers_barbeiro_read" on customers;
create policy "customers_barbeiro_read" on customers
  for select using (auth_role() = 'barbeiro' and barbeiro_has_appointment_with_customer(id));
