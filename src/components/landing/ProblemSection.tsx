const PAIN_POINTS = [
  'Cliente manda mensagem perguntando se tem horário livre e espera resposta',
  'Agenda anotada em caderno, ou espalhada entre vários profissionais',
  'Encaixe de última hora que vira conflito de horário sem ninguém perceber',
  'Nenhum histórico organizado de quem já foi atendido, quando e por qual profissional',
];

export function ProblemSection() {
  return (
    <section className="border-y border-zinc-100 bg-zinc-50/60 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Marcar horário não devia dar tanto trabalho
          </h2>
          <p className="mt-4 text-base text-graphite">
            Sem uma agenda organizada, cada agendamento novo depende de troca de mensagem e atenção manual — pra
            barbearia e pra cliente.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PAIN_POINTS.map((point) => (
            <div key={point} className="rounded-card border border-zinc-100 bg-white p-5 text-sm text-graphite">
              {point}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
