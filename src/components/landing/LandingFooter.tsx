import { Link } from 'react-router-dom';
import { AgencyCredit } from '@/components/public/AgencyCredit';

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-ink py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-xl font-semibold tracking-tight">Star<span className="text-accent">Barber</span></p>
            <p className="mt-2 text-sm text-white/55">Agendamento e gestão para barbearias.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/55">
            <Link to="/admin/login" className="hover:text-white">Área administrativa</Link>
            <span>© {new Date().getFullYear()} StarBarber</span>
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <AgencyCredit />
          <span className="text-xs text-white/35">Feito para facilitar o próximo horário.</span>
        </div>
      </div>
    </footer>
  );
}
