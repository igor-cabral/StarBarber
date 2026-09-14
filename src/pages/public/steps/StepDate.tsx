import { useMemo } from 'react';
import { useBooking } from '@/components/booking/BookingContext';

function buildNext30Days() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function StepDate({ onNext }: { onNext: () => void }) {
  const { selection, update } = useBooking();
  const days = useMemo(buildNext30Days, []);

  function choose(date: Date) {
    const iso = date.toISOString().slice(0, 10);
    update({ date: iso, slot: null });
    onNext();
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl font-semibold tracking-tight">Escolha a data</h2>
      <p className="mb-6 text-sm text-graphite">Selecione o melhor dia para você.</p>
      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
        {days.map((d) => {
          const iso = d.toISOString().slice(0, 10);
          const isSelected = selection.date === iso;
          return (
            <button
              key={iso}
              onClick={() => choose(d)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-sm transition-colors ${
                isSelected
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-zinc-200 text-graphite hover:border-ink hover:text-ink'
              }`}
            >
              <span className="text-xs">{WEEKDAY_LABELS[d.getDay()]}</span>
              <span className="font-semibold">{d.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
