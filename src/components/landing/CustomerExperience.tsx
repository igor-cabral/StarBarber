import { Store, Scissors, UserRound, Clock3, UserPlus, CheckCircle2 } from 'lucide-react';

const FLOW = [
  { icon: Store, label: 'Barbearia' },
  { icon: Scissors, label: 'Serviço' },
  { icon: UserRound, label: 'Profissional' },
  { icon: Clock3, label: 'Horário' },
  { icon: UserPlus, label: 'Dados' },
  { icon: CheckCircle2, label: 'Confirmação' },
];

export function CustomerExperience() {
  return (
    <section id="experiencia-cliente" className="py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Uma experiência própria para o cliente da barbearia
          </h2>
          <p className="mt-4 text-base text-graphite">
            O StarBarber não é só uma ferramenta interna — é a página que o cliente da sua barbearia usa pra
            agendar, sem precisar instalar nada ou entrar em grupo de WhatsApp.
          </p>
        </div>

        <div className="mt-12 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          {FLOW.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3 sm:flex-col sm:gap-2 sm:text-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-ink">
                <step.icon size={20} />
              </div>
              <span className="text-sm font-medium text-ink sm:text-xs">{step.label}</span>
              {i < FLOW.length - 1 && (
                <div className="hidden h-px flex-1 bg-zinc-200 sm:block" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
