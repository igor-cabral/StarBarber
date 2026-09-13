# Sistema de Agendamento para Barbearias

Sistema completo (área pública + painel administrativo) para agendamento online de barbearias, com arquitetura preparada para multi-tenant/SaaS.

## Stack

React + Vite + TypeScript + Tailwind CSS + Supabase (Postgres + Auth + RLS) + React Router.

## 1. Configurar o Supabase

1. Crie um projeto em https://supabase.com.
2. No SQL Editor do projeto, execute **na ordem**, cada arquivo de `supabase/migrations/`:
   1. `0001_schema.sql` — tabelas, relacionamentos, constraints (inclui a trava anti-conflito de horário).
   2. `0002_functions.sql` — funções de disponibilidade e criação de agendamento (versão antiga, sem login).
   3. `0003_rls.sql` — Row Level Security (isolamento entre barbearias).
   4. `0004_seed.sql` — dados de demonstração (Barbearia Prime).
   5. `0005_accounts_and_roles.sql` — papéis (master/admin/caixa/barbeiro), bloqueio de barbearia, login de clientes, convites.
   6. `0006_accounts_functions.sql` — funções de convite, agendamento pelo cliente logado, cancelamento/remarcação pelo próprio cliente.
   7. `0007_accounts_rls.sql` — RLS do usuário master, autoatendimento do cliente, convites e notificações.
   8. `0008_role_scoped_rls.sql` — correção de auditoria: restringe o papel barbeiro aos próprios agendamentos/clientes (antes, qualquer papel da equipe enxergava tudo da barbearia).
   9. `0009_appointment_integrity.sql` — correção de auditoria: valida no banco que profissional, serviço e barbearia são consistentes entre si antes de criar um agendamento.
   10. `0010_fix_rls_recursion.sql` — correção crítica: recursão infinita entre as policies de `appointments` e `customers`.
   11. `0011_security_hardening.sql` — search_path fixo em toda função SECURITY DEFINER, menor privilégio em `notifications` (barbeiro só vê as dos próprios agendamentos), e trava de estado final (agendamento cancelado/concluído não pode mais ser alterado).
3. Em **Project Settings → API**, copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

   **Nunca** copie a `service_role key` para o frontend.

4. Crie o **usuário master** (a empresa que administra o sistema):
   - Em **Authentication → Users**, clique em "Add user" e crie um usuário com e-mail/senha.
   - No SQL Editor, rode (trocando o UUID pelo `id` do usuário criado):
     ```sql
     insert into profiles (id, role, full_name)
     values ('UUID-DO-USUARIO', 'master', 'Sua Empresa');
     ```
   - Acesse `/master/login` com esse usuário. A partir daí, **todo o resto é feito pela interface**: o master cria cada barbearia e gera um link de convite de administrador — não é mais necessário criar o admin da barbearia manualmente pelo SQL Editor.

## Como o acesso funciona agora

- **Master** (`/master/login`): cria/bloqueia barbearias, gera convites de administrador, remove o acesso de qualquer usuário do sistema.
- **Admin da barbearia** (`/admin/login`): acesso completo à própria barbearia; em **Equipe**, gera convites para **Caixa** e **Profissional (barbeiro)**.
- **Caixa**: mesmo login (`/admin/login`), mas sem acesso a Serviços/Profissionais/Horários/Configurações/Equipe.
- **Barbeiro**: mesmo login, mas só enxerga a própria agenda/agendamentos (filtrado automaticamente pelo profissional vinculado no convite).
- **Cliente** (`/conta/entrar` e `/conta/cadastro`, na área pública): cria conta com e-mail/senha/WhatsApp, agenda, vê histórico, cancela e remarca os próprios agendamentos em `/conta`. O login agora é **obrigatório** para concluir um agendamento.
- Convites são links de uso único (`/convite/:token`), válidos por 14 dias — a pessoa convidada cria a própria senha, sem que ninguém precise compartilhar credenciais.

**Confirmação de e-mail:** por padrão o Supabase exige confirmar o e-mail antes de liberar sessão. Se isso estiver ativado no seu projeto (**Authentication → Providers → Email**), tanto clientes quanto convites de equipe vão pedir para a pessoa confirmar o e-mail antes do primeiro login — o app já trata os dois casos. Se preferir liberar o acesso imediatamente (comum em fase de testes), desative "Confirm email" nessa mesma tela. Configure também **Authentication → URL Configuration → Site URL** com a URL da Vercel, para os links de recuperação de senha funcionarem corretamente em produção.

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
- Login/cadastro de clientes (e-mail, senha e WhatsApp) — obrigatório para concluir um agendamento.
- Fluxo de agendamento em 5 etapas (serviço → profissional → data → horário → login + confirmação), com checagem de conflito garantida no banco (constraint `EXCLUDE` + função `create_customer_appointment`).
- Tela de confirmação com código único, adicionar ao calendário (.ics) e link direto para WhatsApp.
- Portal do cliente (`/conta`): histórico de agendamentos, cancelamento e remarcação (com nova checagem de disponibilidade).
- Painel administrativo com 4 papéis: **master** (gestão de todas as barbearias e usuários, bloqueio de sistema), **admin** (acesso completo à própria barbearia + convites de equipe), **caixa** (agenda/agendamentos/clientes) e **barbeiro** (só a própria agenda).
- Dashboard, agenda (dia/semana/lista) com troca de status, remarcação e cancelamento; lista de agendamentos com filtros; clientes com histórico; CRUD de serviços e profissionais; configuração de expediente + bloqueios/folgas; configurações gerais da barbearia; convites de equipe (`Equipe`).
- Sino de notificações para a equipe quando um cliente cancela ou remarca.
- Autenticação via Supabase Auth (staff e clientes são contas separadas) e RLS multi-tenant completo, incluindo bypass total para o master.

## O que fica como próximo passo (depende de decisões suas)

- Cadastro de logo/fotos: hoje os campos `logo_url`/`photo_url` existem no banco, mas o upload de arquivo (Supabase Storage) não foi implementado — é rápido de adicionar quando você definir o bucket.
- Envio de WhatsApp/e-mail automático (hoje o cliente que clica no botão do WhatsApp) — para automatizar, você precisaria de uma API do WhatsApp Business ou um serviço como Twilio, o que exige conta/credenciais próprias.
- Multi-domínio real (`barbeariaa.com.br`, `barbeariab.com.br` no mesmo deploy): a estrutura do banco já suporta (via `slug`); falta a lógica de resolver o tenant pelo `hostname` em vez da env var `VITE_DEFAULT_BARBERSHOP_SLUG` — depende de como você for configurar DNS/domínios na Vercel.
- Notificações em tempo real: hoje o sino atualiza a cada 30s (polling). Dá para trocar por Supabase Realtime (`supabase.channel`) para atualização instantânea.
- O master remove o *acesso* de um usuário (apaga o perfil), mas não apaga a conta de login em si — isso exige a Admin API do Supabase (`service_role`), que não deve rodar no frontend. Se precisar disso, o caminho é uma Edge Function.
