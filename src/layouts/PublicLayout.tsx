import { Link, Outlet, useLocation } from 'react-router-dom';
import { useBarbershop } from '@/hooks/useBarbershop';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { BarbershopNotFoundPage } from '@/pages/public/BarbershopNotFoundPage';
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner';
import { AgencyFooter } from '@/components/public/AgencyFooter';
import { publicPath } from '@/utils/publicPath';
import { Menu, X, UserCircle2, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

export function PublicLayout() {
  const { barbershop, loading, error, notFound } = useBarbershop();
  const { user } = useCustomerAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!barbershop) return;
    document.title = `${barbershop.name} | Agendamento`;
    const description = barbershop.description || `Agende seu horário na ${barbershop.name}.`;
    let meta = document.querySelector('meta[name=description]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [barbershop]);

  if (loading) return <LoadingState label="Carregando barbearia…" />;
  if (notFound) return <BarbershopNotFoundPage />;
  if (error || !barbershop) return <ErrorState message={error ?? 'Barbearia não encontrada.'} />;

  const slug = barbershop.slug;
  const base = publicPath(slug);
  const localPath = location.pathname.startsWith(base) ? location.pathname.slice(base.length) || '/' : location.pathname;

  const NAV_LINKS = [
    { to: base, label: 'Início' },
    { to: `${base}#servicos`, label: 'Serviços' },
    { to: `${base}#profissionais`, label: 'Profissionais' },
    { to: publicPath(slug, '/loja'), label: 'Loja' },
  ];

  const isBookingFlow = localPath.startsWith('/agendar');
  const isAccountArea = localPath.startsWith('/conta');
  const isLegalPage = ['/termos', '/privacidade', '/cookies'].includes(localPath);

  if (!barbershop.active && !isAccountArea && !isLegalPage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-5 text-center text-ink">
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
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to={base} className="flex min-w-0 items-center gap-3" aria-label={`Página inicial de ${barbershop.name}`}>
            {barbershop.logo_url ? (
              <img src={barbershop.logo_url} alt="" className="h-9 w-9 rounded-xl border border-zinc-100 object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink font-display text-sm font-semibold text-paper">
                {barbershop.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate font-display text-lg font-semibold tracking-tight">{barbershop.name}</span>
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
                <Link to={accountLink} className="flex items-center gap-1.5 text-sm text-graphite transition-colors hover:text-ink">
                  <UserCircle2 size={18} />
                  {user ? 'Minha conta' : 'Entrar'}
                </Link>
                <Link to={publicPath(slug, '/agendar')} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5">
                  Agendar
                </Link>
              </div>
              <button className="rounded-lg p-2 md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Abrir menu" aria-expanded={menuOpen}>
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </>
          )}
        </div>

        {menuOpen && !isBookingFlow && (
          <div className="border-t border-zinc-100 px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a key={link.to} href={link.to} className="text-sm text-graphite" onClick={() => setMenuOpen(false)}>{link.label}</a>
              ))}
              <Link to={accountLink} className="text-sm text-graphite" onClick={() => setMenuOpen(false)}>{user ? 'Minha conta' : 'Entrar'}</Link>
              <Link to={publicPath(slug, '/agendar')} className="rounded-xl bg-ink px-5 py-2.5 text-center text-sm font-medium text-paper" onClick={() => setMenuOpen(false)}>Agendar</Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet context={{ barbershop }} />
      </main>

      <AgencyFooter
        links={[
          { to: publicPath(slug, '/termos'), label: 'Termos de Uso' },
          { to: publicPath(slug, '/privacidade'), label: 'Privacidade' },
          { to: publicPath(slug, '/cookies'), label: 'Cookies' },
        ]}
      />

      {!isBookingFlow && <CookieConsentBanner slug={slug} />}
    </div>
  );
}
