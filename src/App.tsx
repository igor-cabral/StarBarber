import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { MasterLayout } from '@/layouts/MasterLayout';
import { HomePage } from '@/pages/public/HomePage';
import { BookingFlowPage } from '@/pages/public/BookingFlowPage';
import { ConfirmationPage } from '@/pages/public/ConfirmationPage';
import { ContaLoginPage } from '@/pages/public/ContaLoginPage';
import { ContaCadastroPage } from '@/pages/public/ContaCadastroPage';
import { ContaPage } from '@/pages/public/ContaPage';
import { ContaNovaSenhaPage } from '@/pages/public/ContaNovaSenhaPage';
import { LoginPage } from '@/pages/admin/LoginPage';
import { ResetPasswordPage } from '@/pages/admin/ResetPasswordPage';
import { InviteRedeemPage } from '@/pages/admin/InviteRedeemPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { AgendaPage } from '@/pages/admin/AgendaPage';
import { AppointmentsPage } from '@/pages/admin/AppointmentsPage';
import { ClientsPage } from '@/pages/admin/ClientsPage';
import { ServicesPage } from '@/pages/admin/ServicesPage';
import { BarbersPage } from '@/pages/admin/BarbersPage';
import { WorkingHoursPage } from '@/pages/admin/WorkingHoursPage';
import { TeamPage } from '@/pages/admin/TeamPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { MasterLoginPage } from '@/pages/master/MasterLoginPage';
import { MasterDashboardPage } from '@/pages/master/MasterDashboardPage';

export default function App() {
  return (
    <Routes>
      {/* Área pública */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/agendar" element={<BookingFlowPage />} />
        <Route path="/agendar/confirmado/:code" element={<ConfirmationPage />} />
        <Route path="/conta/entrar" element={<ContaLoginPage />} />
        <Route path="/conta/cadastro" element={<ContaCadastroPage />} />
        <Route path="/conta/nova-senha" element={<ContaNovaSenhaPage />} />
        <Route path="/conta" element={<ContaPage />} />
      </Route>

      {/* Convite de equipe (admin/caixa/barbeiro se autocadastrando) */}
      <Route path="/convite/:token" element={<InviteRedeemPage />} />

      {/* Autenticação administrativa (fora do layout com sidebar) */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin/reset-password" element={<ResetPasswordPage />} />

      {/* Painel administrativo (admin / caixa / barbeiro) */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="agendamentos" element={<AppointmentsPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="servicos" element={<ServicesPage />} />
        <Route path="profissionais" element={<BarbersPage />} />
        <Route path="horarios" element={<WorkingHoursPage />} />
        <Route path="equipe" element={<TeamPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
      </Route>

      {/* Painel master (empresa que administra o sistema) */}
      <Route path="/master/login" element={<MasterLoginPage />} />
      <Route path="/master" element={<MasterLayout />}>
        <Route index element={<MasterDashboardPage />} />
      </Route>
    </Routes>
  );
}
