import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#experiencia-cliente', label: 'Experiência do cliente' },
];

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-100 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a href="#top" className="font-display text-lg font-semibold tracking-tight">
          Star<span className="text-accent">Barber</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-graphite transition-colors hover:text-ink">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/admin/login" className="text-sm text-graphite transition-colors hover:text-ink">
            Entrar
          </Link>
          <a
            href="#como-funciona"
            className="rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Ver como funciona
          </a>
        </div>

        <button className="md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Abrir menu">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-zinc-100 px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm text-graphite" onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            ))}
            <Link to="/admin/login" className="text-sm text-graphite" onClick={() => setMenuOpen(false)}>
              Entrar
            </Link>
            <a
              href="#como-funciona"
              className="rounded-xl bg-ink px-5 py-2.5 text-center text-sm font-medium text-paper"
              onClick={() => setMenuOpen(false)}
            >
              Ver como funciona
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
