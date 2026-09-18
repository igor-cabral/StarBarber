import { Settings2, Share2, CalendarCheck, ClipboardList } from 'lucide-react';

const STEPS = [
  {
    icon: Settings2,
    title: 'Configure sua barbearia',
    description: 'Cadastre serviços, profissionais, horários de trabalho e folgas.',
  },
  {
    icon: Share2,
    title: 'Compartilhe sua página',
    description: 'Sua barbearia ganha um endereço próprio dentro do StarBarber para os clientes agendarem.',
  },
  {
    icon: CalendarCheck,
    title: 'O cliente agenda sozinho',
    description: 'Escolhe serviço, profissional, data e horário disponível, e confirma com uma conta própria.',
  },
  {
    icon: ClipboardList,
    title: 'Sua equipe administra',
    description: 'Acompanhe a agenda, confirme, cancele ou remarque — com aviso quando o cliente mexe no próprio horário.',
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Como funciona</h2>
          <p className="mt-4 text-base text-graphite">
            Cada barbearia tem sua própria página pública dentro do StarBarber — algo como{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.85em] text-ink">
              starbarber.app/b/sua-barbearia
            </code>
            .
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                  <step.icon size={18} />
                </div>
                <span className="font-display text-sm text-graphite">0{i + 1}</span>
              </div>
              <h3 className="font-medium text-ink">{step.title}</h3>
              <p className="text-sm leading-relaxed text-graphite">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
