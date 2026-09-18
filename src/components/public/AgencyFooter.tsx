import { Link } from 'react-router-dom';
import { AgencyCredit } from './AgencyCredit';

interface Props {
  links?: Array<{ to: string; label: string }>;
}

export function AgencyFooter({ links = [] }: Props) {
  return (
    <footer className="mt-16 border-t border-white/10 bg-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">
              Star<span className="text-accent">Barber</span>
            </p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/55">
              Agendamento simples e uma experiência melhor para clientes e barbearias.
            </p>
          </div>
          {links.length > 0 && (
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60" aria-label="Links legais">
              {links.map((link) => (
                <Link key={link.to} to={link.to} className="transition-colors hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <AgencyCredit />
          <p className="text-xs text-white/40">© {new Date().getFullYear()} StarBarber. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
