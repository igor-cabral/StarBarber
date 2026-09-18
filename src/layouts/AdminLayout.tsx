import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
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
  UserCog,
  ShieldAlert,
  Package,
  ShoppingCart,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/services/auth';
import { isShopStaffProfile } from '@/services/auth';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { StaffRole } from '@/types';

const NAV_ITEMS: { to: string; label: string; icon: any; end?: boolean; roles: StaffRole[] }[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ['admin', 'caixa', 'barbeiro'] },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays, roles: ['admin', 'caixa', 'barbeiro'] },
  { to: '/admin/agendamentos', label: 'Agendamentos', icon: ListChecks, roles: ['admin', 'caixa', 'barbeiro'] },
  { to: '/admin/clientes', label: 'Clientes', icon: Users, roles: ['admin', 'caixa'] },
  { to: '/admin/servicos', label: 'Serviços', icon: Scissors, roles: ['admin'] },
  { to: '/admin/produtos', label: 'Produtos', icon: Package, roles: ['admin'] },
  { to: '/admin/caixa', label: 'Frente de caixa', icon: ShoppingCart, roles: ['admin', 'caixa'] },
  { to: '/admin/profissionais', label: 'Profissionais', icon: UserSquare2, roles: ['admin'] },
  { to: '/admin/horarios', label: 'Horários', icon: Clock, roles: ['admin'] },
  { to: '/admin/equipe', label: 'Equipe', icon: UserCog, roles: ['admin'] },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin'] },
];

export function AdminLayout() {
  const { profile, loading, status } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  // nunca decide "não autenticado" enquanto a sessão ainda está carregando
  if (status === 'loading' || loading) return <LoadingState label="Carregando…" />;
  if (!profile) return <Navigate to="/admin/login" replace />;
  if (profile.role === 'master') return <Navigate to="/master" replace />;

  async function handleSignOut() {
    await signOut();
    navigate('/admin/login');
  }

  if (profile.barbershop_active === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 px-5 text-center">
        <ShieldAlert size={32} className="text-red-500" />
        <h1 className="font-display text-xl font-semibold">Sistema temporariamente bloqueado</h1>
        <p className="max-w-sm text-sm text-graphite">
          O acesso desta barbearia foi suspenso pelo administrador do sistema. Entre em contato com o suporte para
          mais informações.
        </p>
        <button onClick={handleSignOut} className="mt-2 text-sm text-graphite underline">
          Sair
        </button>
      </div>
    );
  }

  // Garantia real (não só de tipo): todo papel que chega até aqui
  // (exceto master, já redirecionado acima) precisa ter barbershop_id.
  // O banco garante isso via constraint (profiles_shop_consistency),
  // mas nunca confiamos apenas nisso — se por algum motivo vier nulo,
  // mostramos um erro amigável em vez de deixar uma query estourar
  // com "invalid input syntax for type uuid".
  if (!isShopStaffProfile(profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <ErrorState message="Não foi possível carregar os dados da sua barbearia. Faça login novamente." />
      </div>
    );
  }

  const items = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));

  return (
    <div className="flex min-h-screen bg-zinc-50 text-ink">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white px-4 py-6 md:flex">
        <SidebarContent items={items} onNavigate={() => {}} onSignOut={handleSignOut} />
      </aside>

      {/* Sidebar mobile (drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-64 bg-white px-4 py-6 shadow-xl">
            <SidebarContent items={items} onNavigate={() => setMobileOpen(false)} onSignOut={handleSignOut} />
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
          <button className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          <span className="hidden font-display font-semibold md:block">{profile.barbershop_name}</span>
          <div className="flex items-center gap-2">
            {(profile.role === 'admin' || profile.role === 'caixa') && profile.barbershop_id && (
              <NotificationBell barbershopId={profile.barbershop_id} />
            )}
          </div>
        </header>
        <main className="p-5 md:p-8">
          <Outlet context={{ profile }} />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  items,
  onNavigate,
  onSignOut,
}: {
  items: typeof NAV_ITEMS;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <span className="font-display text-lg font-semibold">Painel</span>
        <button className="md:hidden" onClick={onNavigate} aria-label="Fechar menu">
          <X size={20} />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
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
