import { LayoutDashboard, CalendarDays, ListChecks, Users, Scissors, UserSquare2, Clock } from 'lucide-react';

const NAV_PREVIEW = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: CalendarDays, label: 'Agenda' },
  { icon: ListChecks, label: 'Agendamentos' },
  { icon: Users, label: 'Clientes' },
  { icon: Scissors, label: 'Serviços' },
  { icon: UserSquare2, label: 'Profissionais' },
  { icon: Clock, label: 'Horários' },
];

export function ProductShowcase() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-md">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Um painel para quem administra a barbearia
            </h2>
            <p className="mt-4 text-base text-graphite">
              Enquanto o cliente agenda sozinho pela página pública, sua equipe acompanha tudo por aqui — com login
              separado para administrador, caixa e cada barbeiro.
            </p>
          </div>

          {/* Mockup do painel — composição estática, sem dados reais */}
          <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-card">
            <div className="flex flex-col sm:flex-row">
              <div className="flex gap-1 overflow-x-auto border-b border-zinc-100 bg-zinc-50/60 p-3 sm:w-40 sm:shrink-0 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r">
                {NAV_PREVIEW.map((item) => (
                  <div
                    key={item.label}
                    className={`flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs ${
                      item.active ? 'bg-ink text-paper' : 'text-graphite'
                    }`}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-graphite">Hoje</p>
                <div className="mb-5 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Agendamentos', value: '—' },
                    { label: 'Confirmados', value: '—' },
                    { label: 'Pendentes', value: '—' },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg border border-zinc-100 p-2.5">
                      <p className="text-[10px] text-graphite">{m.label}</p>
                      <p className="text-sm font-semibold text-ink">{m.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-graphite">Próximos horários</p>
                <div className="flex flex-col gap-1.5">
                  {['09:00', '09:40', '10:20'].map((t) => (
                    <div key={t} className="flex items-center gap-2 rounded-lg border border-zinc-100 px-2.5 py-1.5">
                      <span className="w-10 text-xs font-medium text-ink">{t}</span>
                      <span className="h-1.5 flex-1 rounded-full bg-zinc-100" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
