import { Link } from 'react-router-dom';
import { Check, Clock3, Scissors } from 'lucide-react';

export function Hero() {
  return (
    <section id="top" className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:pt-20 lg:grid-cols-2 lg:gap-8 lg:pb-28 lg:pt-24">
      <div className="flex flex-col items-start gap-6">
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          Agendamento e gestão para barbearias
        </span>
        <h1 className="max-w-xl font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]">
          Agenda organizada.
          <br />
          Cliente atendido sem trocar uma mensagem.
        </h1>
        <p className="max-w-md text-base leading-relaxed text-graphite">
          O StarBarber dá à sua barbearia uma página própria de agendamento online e um painel para administrar
          profissionais, serviços, horários e atendimentos — tudo em um só lugar.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="#como-funciona"
            className="animate-rise-in rounded-xl bg-ink px-7 py-3.5 text-center text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Ver como funciona
          </a>
          <Link
            to="/admin/login"
            className="animate-rise-in rounded-xl border border-zinc-200 px-7 py-3.5 text-center text-sm font-medium text-ink transition-colors hover:border-ink"
          >
            Já uso o StarBarber
          </Link>
        </div>
      </div>

      {/* Composição visual do produto — ilustrativa, sem dados reais */}
      <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
        <div className="animate-rise-in rounded-2xl border border-zinc-100 bg-white p-5 shadow-card">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-graphite">Escolha o serviço</p>
          <div className="flex flex-col gap-2">
            {[
              { name: 'Corte + Barba', time: '60 min', active: true },
              { name: 'Corte Masculino', time: '40 min', active: false },
              { name: 'Platinado', time: '120 min', active: false },
            ].map((s) => (
              <div
                key={s.name}
                className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm ${
                  s.active ? 'border-accent bg-accent-soft' : 'border-zinc-100'
                }`}
              >
                <span className="flex items-center gap-2 font-medium text-ink">
                  <Scissors size={14} className="text-graphite" />
                  {s.name}
                </span>
                <span className="flex items-center gap-1 text-xs text-graphite">
                  <Clock3 size={12} /> {s.time}
                </span>
              </div>
            ))}
          </div>

          <p className="mb-3 mt-5 text-xs font-medium uppercase tracking-wide text-graphite">Horários livres</p>
          <div className="grid grid-cols-4 gap-2">
            {['09:00', '09:40', '10:20', '14:00'].map((time, i) => (
              <div
                key={time}
                className={`rounded-lg border py-2 text-center text-xs font-medium ${
                  i === 2 ? 'border-ink bg-ink text-paper' : 'border-zinc-100 text-ink'
                }`}
              >
                {time}
              </div>
            ))}
          </div>
        </div>

        {/* Cartão de confirmação flutuante */}
        <div className="animate-rise-in absolute -bottom-6 -left-4 hidden w-56 rounded-xl border border-zinc-100 bg-white p-4 shadow-card sm:block lg:-left-8">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Check size={16} />
          </div>
          <p className="text-sm font-medium text-ink">Agendamento confirmado</p>
          <p className="mt-0.5 font-mono text-xs text-graphite">AGD-7K2QX</p>
        </div>
      </div>
    </section>
  );
}
