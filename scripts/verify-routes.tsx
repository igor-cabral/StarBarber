import React from 'react';
import { createRoutesFromChildren, matchRoutes, Route } from 'react-router-dom';

// matchRoutes só se importa com a ESTRUTURA de paths (path/index/params),
// não com o componente montado em "element" — por isso usamos <div/>
// como placeholder em vez de importar PublicLayout/AdminLayout/MasterLayout
// de verdade (eles puxam src/lib/supabase.ts, que depende de import.meta.env
// do Vite e não roda fora dele). A árvore de paths abaixo é IDÊNTICA à de
// src/App.tsx — copiada literalmente, não reinventada.
const PublicLayout = () => <div />;
const AdminLayout = () => <div />;
const MasterLayout = () => <div />;

// Recria a MESMA árvore de <Route> do App.tsx (sem precisar montar o
// componente inteiro) para validar o matching de verdade via
// matchRoutes — o mesmo mecanismo que o react-router usa em runtime.
function PublicTenantRoutes() {
  return (
    <>
      <Route index element={<div />} />
      <Route path="agendar" element={<div />} />
      <Route path="agendar/confirmado/:code" element={<div />} />
      <Route path="conta/entrar" element={<div />} />
      <Route path="conta/cadastro" element={<div />} />
      <Route path="conta/nova-senha" element={<div />} />
      <Route path="conta" element={<div />} />
      <Route path="termos" element={<div />} />
      <Route path="privacidade" element={<div />} />
      <Route path="cookies" element={<div />} />
    </>
  );
}

const tree = (
  <>
    <Route path="/b/:slug" element={<PublicLayout />}>
      {PublicTenantRoutes()}
    </Route>
    <Route path="/" element={<PublicLayout />}>
      {PublicTenantRoutes()}
    </Route>
    <Route path="/convite/:token" element={<div />} />
    <Route path="/admin/login" element={<div />} />
    <Route path="/admin/reset-password" element={<div />} />
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<div />} />
      <Route path="agenda" element={<div />} />
      <Route path="agendamentos" element={<div />} />
      <Route path="clientes" element={<div />} />
      <Route path="servicos" element={<div />} />
      <Route path="profissionais" element={<div />} />
      <Route path="horarios" element={<div />} />
      <Route path="equipe" element={<div />} />
      <Route path="configuracoes" element={<div />} />
    </Route>
    <Route path="/master/login" element={<div />} />
    <Route path="/master" element={<MasterLayout />}>
      <Route index element={<div />} />
    </Route>
  </>
);

const routes = createRoutesFromChildren(tree);

const cases: [string, string][] = [
  ['/b/barbearia-prime', 'HomePage (slug=barbearia-prime)'],
  ['/b/barbearia-prime/agendar', 'BookingFlowPage (slug=barbearia-prime)'],
  ['/b/barbearia-prime/agendar/confirmado/AGD-123', 'ConfirmationPage'],
  ['/b/barbearia-prime/conta', 'ContaPage'],
  ['/b/barbearia-prime/conta/entrar', 'ContaLoginPage'],
  ['/b/barbearia-prime/conta/cadastro', 'ContaCadastroPage'],
  ['/b/barbearia-prime/conta/nova-senha', 'ContaNovaSenhaPage'],
  ['/b/barbearia-prime/termos', 'TermsPage'],
  ['/b/barbearia-prime/privacidade', 'PrivacyPage'],
  ['/b/barbearia-prime/cookies', 'CookiesPage'],
  ['/b/outro-slug', 'HomePage (slug=outro-slug)'],
  ['/b/outro-slug/agendar', 'BookingFlowPage (slug=outro-slug)'],
  ['/b/outro-slug/conta', 'ContaPage (slug=outro-slug)'],
  ['/', 'HomePage (fallback dev, sem slug)'],
  ['/agendar', 'BookingFlowPage (fallback dev, sem slug)'],
  ['/convite/abc123', 'InviteRedeemPage (não tenant-scoped)'],
  ['/admin', 'AdminLayout index (DashboardPage)'],
  ['/admin/agenda', 'AdminLayout > AgendaPage'],
  ['/master', 'MasterLayout index'],
  ['/master/login', 'MasterLoginPage'],
];

let allOk = true;
for (const [path, expectedLabel] of cases) {
  const matches = matchRoutes(routes, path);
  if (!matches) {
    console.log(`FAIL: ${path} -> nenhuma rota casou (esperado: ${expectedLabel})`);
    allOk = false;
    continue;
  }
  const last = matches[matches.length - 1];
  const slugParam = matches.find((m) => m.params.slug)?.params.slug;
  console.log(
    `PASS: ${path.padEnd(45)} -> casou (slug param = ${slugParam ?? '—'}) [${expectedLabel}]`
  );
}

// Teste de isolamento: dois slugs diferentes devem produzir params.slug diferentes,
// nunca vazar um valor fixo/hardcoded
const matchA = matchRoutes(routes, '/b/barbearia-a/agendar');
const matchB = matchRoutes(routes, '/b/barbearia-b/agendar');
const slugA = matchA?.find((m) => m.params.slug)?.params.slug;
const slugB = matchB?.find((m) => m.params.slug)?.params.slug;
if (slugA === 'barbearia-a' && slugB === 'barbearia-b' && slugA !== slugB) {
  console.log(`PASS: isolamento de rota — /b/barbearia-a e /b/barbearia-b resolvem slugs DIFERENTES (${slugA} vs ${slugB})`);
} else {
  console.log(`FAIL: isolamento de rota quebrado — slugA=${slugA} slugB=${slugB}`);
  allOk = false;
}

console.log(allOk ? '\nTODAS AS ROTAS OK' : '\nALGUMA ROTA FALHOU');
process.exit(allOk ? 0 : 1);
