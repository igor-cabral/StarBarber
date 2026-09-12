-- =========================================================
-- 0004_seed.sql
-- Dados de demonstração — Barbearia Prime
-- =========================================================

insert into barbershops (id, slug, name, tagline, phone, whatsapp, instagram, address, color_accent)
values (
  '00000000-0000-0000-0000-000000000001',
  'barbearia-prime',
  'Barbearia Prime',
  'Seu estilo começa aqui.',
  '(47) 99999-0000',
  '5547999990000',
  '@barbeariaprime',
  'Rua das Tesouras, 123 — Blumenau, SC',
  '#C89B3C'
);

insert into services (barbershop_id, name, description, price_cents, duration_minutes)
values
  ('00000000-0000-0000-0000-000000000001', 'Corte Masculino', 'Corte tradicional com acabamento na navalha.', 4500, 40),
  ('00000000-0000-0000-0000-000000000001', 'Barba', 'Modelagem completa com toalha quente.', 3000, 30),
  ('00000000-0000-0000-0000-000000000001', 'Corte + Barba', 'Combo completo.', 6500, 60),
  ('00000000-0000-0000-0000-000000000001', 'Platinado', 'Descoloração + tonalização.', 12000, 120);

insert into barbers (id, barbershop_id, name, description, specialties)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'João Silva', 'Especialista em cortes clássicos e acabamento.', array['Corte','Barba','Acabamento']),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Pedro Santos', 'Focado em degradê e barbas desenhadas.', array['Degradê','Barba']),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Lucas Oliveira', 'Referência em coloração e platinados.', array['Coloração','Platinado']);

-- todos os profissionais atendem todos os serviços (ajustável depois)
insert into barber_services (barber_id, service_id)
select b.id, s.id from barbers b, services s where b.barbershop_id = s.barbershop_id;

-- expediente: seg-sex 09:00-19:00 (qui/sex até 21:00), sáb 08:00-17:00, dom fechado
insert into working_hours (barber_id, weekday, start_time, end_time, break_start_time, break_end_time)
select b.id, wd.weekday, wd.start_time, wd.end_time, '12:00', '13:00'
from barbers b
cross join (
  values
    (1, '09:00'::time, '19:00'::time),
    (2, '09:00'::time, '19:00'::time),
    (3, '09:00'::time, '19:00'::time),
    (4, '09:00'::time, '21:00'::time),
    (5, '09:00'::time, '21:00'::time),
    (6, '08:00'::time, '17:00'::time)
) as wd(weekday, start_time, end_time);
