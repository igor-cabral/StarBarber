import { CalendarClock, Users2, ShieldCheck } from 'lucide-react';

const PILLARS = [
  {
    icon: CalendarClock,
    title: 'Agendamento sem conflito',
    items: [
      'Escolha de serviço, profissional e horário disponível',
      'Conflito de horário bloqueado no banco de dados, não só na tela',
      'Cliente cancela e remarca sozinho pela própria conta',
    ],
  },
  {
    icon: Users2,
    title: 'Equipe com o acesso certo',
    items: [
      'Papéis separados: administrador, caixa e cada barbeiro',
      'Barbeiro vê só a própria agenda e os próprios atendimentos',
      'Convites seguros para adicionar alguém à equipe',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Dados e privacidade',
    items: [
      'Consentimento registrado no cadastro do cliente',
      'Cliente pode exportar ou excluir os próprios dados',
      'Notificação interna quando um cliente cancela ou remarca',
    ],
  },
];

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="border-y border-zinc-100 bg-zinc-50/60 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            O que já funciona hoje
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="flex flex-col gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                <pillar.icon size={20} />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink">{pillar.title}</h3>
              <ul className="flex flex-col gap-2.5">
                {pillar.items.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-graphite">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
