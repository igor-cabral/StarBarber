import { Link, Outlet, useLocation } from 'react-router-dom';
import { useBarbershop } from '@/hooks/useBarbershop';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Menu, X, UserCircle2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { to: '/', label: 'Início' },
  { to: '/#servicos', label: 'Serviços' },
  { to: '/#profissionais', label: 'Profissionais' },
];

export function PublicLayout() {
  const { barbershop, loading, error } = useBarbershop();
  const { user } = useCustomerAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isBookingFlow = location.pathname.startsWith('/agendar');
  const isAccountArea = location.pathname.startsWith('/conta');

  if (loading) return <LoadingState label="Carregando barbearia…" />;
  if (error || !barbershop) return <ErrorState message={error ?? 'Barbearia não encontrada.'} />;

  if (!barbershop.active && !isAccountArea) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-5 text-center">
        <ShieldAlert size={32} className="text-graphite" />
        <h1 className="font-display text-xl font-semibold">Indisponível no momento</h1>
        <p className="max-w-sm text-sm text-graphite">
          {barbershop.name} está temporariamente indisponível para novos agendamentos.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight">
            {barbershop.name}
          </Link>

          {!isBookingFlow && (
            <>
              <nav className="hidden items-center gap-8 md:flex">
                {NAV_LINKS.map((link) => (
                  <a key={link.to} href={link.to} className="text-sm text-graphite transition-colors hover:text-ink">
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="hidden items-center gap-3 md:flex">
                <Link
                  to={user ? '/conta' : '/conta/entrar'}
                  className="flex items-center gap-1.5 text-sm text-graphite hover:text-ink"
                >
                  <UserCircle2 size={18} />
                  {user ? 'Minha conta' : 'Entrar'}
                </Link>
                <Link
                  to="/agendar"
                  className="rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
                >
                  Agendar
                </Link>
              </div>
              <button className="md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Abrir menu">
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </>
          )}
        </div>

        {menuOpen && !isBookingFlow && (
          <div className="border-t border-zinc-100 px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a key={link.to} href={link.to} className="text-sm text-graphite" onClick={() => setMenuOpen(false)}>
                  {link.label}
                </a>
              ))}
              <Link to={user ? '/conta' : '/conta/entrar'} className="text-sm text-graphite" onClick={() => setMenuOpen(false)}>
                {user ? 'Minha conta' : 'Entrar'}
              </Link>
              <Link
                to="/agendar"
                className="rounded-xl bg-ink px-5 py-2.5 text-center text-sm font-medium text-paper"
                onClick={() => setMenuOpen(false)}
              >
                Agendar
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        <Outlet context={{ barbershop }} />
      </main>

      {!isBookingFlow && (
        <footer className="border-t border-zinc-100 py-10">
          <div className="mx-auto max-w-6xl px-5 text-sm text-graphite">
            <p>{barbershop.name} — {barbershop.address}</p>
            {barbershop.whatsapp && <p className="mt-1">WhatsApp: {barbershop.whatsapp}</p>}
          </div>
        </footer>
      )}
    </div>
  );
}
