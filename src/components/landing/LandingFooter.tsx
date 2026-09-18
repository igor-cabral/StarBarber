import { Link } from 'react-router-dom';

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-100 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 text-sm text-graphite sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display font-semibold text-ink">
            Star<span className="text-accent">Barber</span>
          </p>
          <p className="mt-1 text-xs text-graphite">Agendamento e gestão para barbearias.</p>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/admin/login" className="hover:text-ink">
            Área administrativa
          </Link>
          <span className="text-xs">© {new Date().getFullYear()} StarBarber</span>
        </div>
      </div>
    </footer>
  );
}
