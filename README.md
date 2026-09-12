# Sistema de Agendamento para Barbearias

Sistema completo (área pública + painel administrativo) para agendamento online de barbearias, com arquitetura preparada para multi-tenant/SaaS.

## Stack

React + Vite + TypeScript + Tailwind CSS + Supabase (Postgres + Auth + RLS) + React Router.

## 1. Configurar o Supabase

1. Crie um projeto em https://supabase.com.
2. No SQL Editor do projeto, execute **na ordem**, cada arquivo de `supabase/migrations/`:
   1. `0001_schema.sql` — tabelas, relacionamentos, constraints (inclui a trava anti-conflito de horário).
   2. `0002_functions.sql` — funções de disponibilidade e criação de agendamento.
   3. `0003_rls.sql` — Row Level Security (isolamento entre barbearias).
   4. `0004_seed.sql` — dados de demonstração (Barbearia Prime).
3. Em **Project Settings → API**, copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

   **Nunca** copie a `service_role key` para o frontend.

4. Crie o primeiro usuário administrador:
   - Em **Authentication → Users**, clique em "Add user" e crie um usuário com e-mail/senha.
   - No SQL Editor, rode (trocando o UUID pelo `id` do usuário criado):
     ```sql
     insert into profiles (id, barbershop_id, role, full_name)
     values ('UUID-DO-USUARIO', '00000000-0000-0000-0000-000000000001', 'admin', 'Seu nome');
     ```

## 2. Rodar localmente

```bash
cp .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env

npm install
npm run dev
```

- Área pública: `http://localhost:5173/`
- Painel administrativo: `http://localhost:5173/admin/login`

## 3. Publicar (Vercel + Supabase)

1. Suba este projeto para um repositório no GitHub.
2. Na Vercel, importe o repositório.
3. Em **Environment Variables**, configure:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DEFAULT_BARBERSHOP_SLUG` (ex: `barbearia-prime`)
4. Build command: `npm run build` — Output directory: `dist` (padrão do Vite, a Vercel detecta automaticamente).

## O que já está implementado

- Página pública com hero, serviços, profissionais, informações e CTA.
- Fluxo de agendamento em 5 etapas (serviço → profissional → data → horário → dados), sem exigir login, com checagem de conflito garantida no banco (constraint `EXCLUDE` + função `create_public_appointment`).
- Tela de confirmação com código único, adicionar ao calendário (.ics) e link direto para WhatsApp.
- Painel administrativo: dashboard, agenda (dia/semana/lista) com troca de status, lista de agendamentos com filtros, clientes com histórico, CRUD de serviços e profissionais (com vínculo N:N), configuração de expediente semanal + bloqueios/folgas, configurações gerais da barbearia (incluindo paleta de cores).
- Autenticação via Supabase Auth (login + recuperação de senha) e RLS multi-tenant completo.

## O que fica como próximo passo (depende de decisões suas)

- Cadastro de logo/fotos: hoje os campos `logo_url`/`photo_url` existem no banco, mas o upload de arquivo (Supabase Storage) não foi implementado — é rápido de adicionar quando você definir o bucket.
- Envio de WhatsApp/e-mail automático (hoje o cliente que clica no botão do WhatsApp) — para automatizar, você precisaria de uma API do WhatsApp Business ou um serviço como Twilio, o que exige conta/credenciais próprias.
- Multi-domínio real (`barbeariaa.com.br`, `barbeariab.com.br` no mesmo deploy): a estrutura do banco já suporta (via `slug`); falta a lógica de resolver o tenant pelo `hostname` em vez da env var `VITE_DEFAULT_BARBERSHOP_SLUG` — depende de como você for configurar DNS/domínios na Vercel.
- Perfil "funcionário" com agenda restrita: o campo `role` e `barber_id` em `profiles` já existem; falta filtrar as telas administrativas por `barber_id` quando `role = 'staff'`.
