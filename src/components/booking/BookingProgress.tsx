const STEPS = ['Serviço', 'Profissional', 'Data', 'Horário', 'Seus dados'];

export function BookingProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const stepNumber = i + 1;
        const state = stepNumber < current ? 'done' : stepNumber === current ? 'active' : 'pending';
        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`h-1.5 w-full rounded-full transition-colors ${
                state === 'pending' ? 'bg-zinc-150 bg-zinc-200' : 'bg-accent'
              }`}
            />
            <span
              className={`hidden text-[11px] sm:block ${
                state === 'active' ? 'font-medium text-ink' : 'text-graphite'
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
