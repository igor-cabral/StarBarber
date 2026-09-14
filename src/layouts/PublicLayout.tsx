import { Link, Outlet, useLocation } from 'react-router-dom';
import { useBarbershop } from '@/hooks/useBarbershop';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { BarbershopNotFoundPage } from '@/pages/public/BarbershopNotFoundPage';
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner';
import { publicPath } from '@/utils/publicPath';
import { Menu, X, UserCircle2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

export function PublicLayout() {
  const { barbershop, loading, error, notFound } = useBarbershop();
  const { user } = useCustomerAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  if (loading) return <LoadingState label="Carregando barbearia…" />;
  if (notFound) return <BarbershopNotFoundPage />;
  if (error || !barbershop) return <ErrorState message={error ?? 'Barbearia não encontrada.'} />;

  const slug = barbershop.slug;
  const base = publicPath(slug);
  // caminho relativo ao tenant atual (ex: "/b/barbearia-prime/agendar" -> "/agendar")
  const localPath = location.pathname.startsWith(base) ? location.pathname.slice(base.length) || '/' : location.pathname;

  const NAV_LINKS = [
    { to: base, label: 'Início' },
    { to: `${base}#servicos`, label: 'Serviços' },
    { to: `${base}#profissionais`, label: 'Profissionais' },
  ];

  const isBookingFlow = localPath.startsWith('/agendar');
  const isAccountArea = localPath.startsWith('/conta');
  const isLegalPage = ['/termos', '/privacidade', '/cookies'].includes(localPath);

  if (!barbershop.active && !isAccountArea && !isLegalPage) {
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

  const accountLink = user ? publicPath(slug, '/conta') : publicPath(slug, '/conta/entrar');

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to={base} className="font-display text-lg font-semibold tracking-tight">
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
                <Link to={accountLink} className="flex items-center gap-1.5 text-sm text-graphite hover:text-ink">
                  <UserCircle2 size={18} />
                  {user ? 'Minha conta' : 'Entrar'}
                </Link>
                <Link
                  to={publicPath(slug, '/agendar')}
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
              <Link to={accountLink} className="text-sm text-graphite" onClick={() => setMenuOpen(false)}>
                {user ? 'Minha conta' : 'Entrar'}
              </Link>
              <Link
                to={publicPath(slug, '/agendar')}
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
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 text-sm text-graphite sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p>{barbershop.name} — {barbershop.address}</p>
              {barbershop.whatsapp && <p className="mt-1">WhatsApp: {barbershop.whatsapp}</p>}
            </div>
            <div className="flex gap-4">
              <Link to={publicPath(slug, '/termos')} className="hover:text-ink">Termos de Uso</Link>
              <Link to={publicPath(slug, '/privacidade')} className="hover:text-ink">Privacidade</Link>
              <Link to={publicPath(slug, '/cookies')} className="hover:text-ink">Cookies</Link>
            </div>
          </div>
        </footer>
      )}

      {!isBookingFlow && <CookieConsentBanner slug={slug} />}
    </div>
  );
}
