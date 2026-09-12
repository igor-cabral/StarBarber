import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { HomePage } from '@/pages/public/HomePage';
import { BookingFlowPage } from '@/pages/public/BookingFlowPage';
import { ConfirmationPage } from '@/pages/public/ConfirmationPage';
import { LoginPage } from '@/pages/admin/LoginPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { AgendaPage } from '@/pages/admin/AgendaPage';
import { AppointmentsPage } from '@/pages/admin/AppointmentsPage';
import { ClientsPage } from '@/pages/admin/ClientsPage';
import { ServicesPage } from '@/pages/admin/ServicesPage';
import { BarbersPage } from '@/pages/admin/BarbersPage';
import { WorkingHoursPage } from '@/pages/admin/WorkingHoursPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';

export default function App() {
  return (
    <Routes>
      {/* Área pública */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/agendar" element={<BookingFlowPage />} />
        <Route path="/agendar/confirmado/:code" element={<ConfirmationPage />} />
      </Route>

      {/* Autenticação administrativa (fora do layout com sidebar) */}
      <Route path="/admin/login" element={<LoginPage />} />

      {/* Painel administrativo */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="agendamentos" element={<AppointmentsPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="servicos" element={<ServicesPage />} />
        <Route path="profissionais" element={<BarbersPage />} />
        <Route path="horarios" element={<WorkingHoursPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
