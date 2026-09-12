import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  ListChecks,
  Users,
  Scissors,
  UserSquare2,
  Clock,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/services/auth';
import { LoadingState } from '@/components/ui/States';
import { Navigate } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/admin/agendamentos', label: 'Agendamentos', icon: ListChecks },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/servicos', label: 'Serviços', icon: Scissors },
  { to: '/admin/profissionais', label: 'Profissionais', icon: UserSquare2 },
  { to: '/admin/horarios', label: 'Horários', icon: Clock },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

export function AdminLayout() {
  const { profile, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) return <LoadingState label="Carregando…" />;
  if (!profile) return <Navigate to="/admin/login" replace />;

  async function handleSignOut() {
    await signOut();
    navigate('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 text-ink">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white px-4 py-6 md:flex">
        <SidebarContent onNavigate={() => {}} onSignOut={handleSignOut} />
      </aside>

      {/* Sidebar mobile (drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-64 bg-white px-4 py-6 shadow-xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} onSignOut={handleSignOut} />
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4 md:hidden">
          <span className="font-display font-semibold">Painel</span>
          <button onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
        </header>
        <main className="p-5 md:p-8">
          <Outlet context={{ profile }} />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate, onSignOut }: { onNavigate: () => void; onSignOut: () => void }) {
  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <span className="font-display text-lg font-semibold">Painel</span>
        <button className="md:hidden" onClick={onNavigate} aria-label="Fechar menu">
          <X size={20} />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive ? 'bg-ink text-paper' : 'text-graphite hover:bg-zinc-100'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={onSignOut}
        className="mt-6 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-graphite hover:bg-zinc-100"
      >
        <LogOut size={18} />
        Sair
      </button>
    </>
  );
}
