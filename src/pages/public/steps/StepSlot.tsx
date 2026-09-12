import { useEffect, useState } from 'react';
import { Barbershop, Slot } from '@/types';
import { getAvailableSlots, getAvailableSlotsForAnyBarber } from '@/services/availability';
import { getBarbersForService } from '@/services/barbershop';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { useBooking } from '@/components/booking/BookingContext';
import { formatTime } from '@/utils/format';

export function StepSlot({ barbershop, onNext }: { barbershop: Barbershop; onNext: () => void }) {
  const { selection, update } = useBooking();
  const [slots, setSlots] = useState<{ slot: Slot; barberId: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selection.service || !selection.date || !selection.barber) return;
    setSlots(null);
    setError(null);

    async function load() {
      try {
        if (selection.barber === 'any') {
          const barbers = await getBarbersForService(barbershop.id, selection.service!.id);
          const result = await getAvailableSlotsForAnyBarber(
            barbers.map((b) => b.id),
            selection.service!.id,
            selection.date!
          );
          setSlots(result);
        } else if (selection.barber) {
          const result = await getAvailableSlots(selection.barber.id, selection.service!.id, selection.date!);
          setSlots(result.map((slot) => ({ slot, barberId: (selection.barber as any).id })));
        }
      } catch (err: any) {
        setError(err.message ?? 'Não foi possível carregar os horários.');
      }
    }
    load();
  }, [barbershop.id, selection.service, selection.date, selection.barber]);

  function choose(item: { slot: Slot; barberId: string }) {
    update({ slot: item.slot, resolvedBarberId: item.barberId });
    onNext();
  }

  if (error) return <ErrorState message={error} />;
  if (!slots) return <LoadingState label="Verificando horários disponíveis…" />;
  if (slots.length === 0)
    return (
      <EmptyState
        title="Nenhum horário disponível nesta data"
        description="Volte e escolha outro dia ou outro profissional."
      />
    );

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl font-semibold tracking-tight">Escolha o horário</h2>
      <p className="mb-6 text-sm text-graphite">Somente horários realmente livres aparecem aqui.</p>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {slots.map((item) => (
          <button
            key={item.slot.slot_start + item.barberId}
            onClick={() => choose(item)}
            className="rounded-xl border border-zinc-200 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent-soft"
          >
            {formatTime(item.slot.slot_start)}
          </button>
        ))}
      </div>
    </div>
  );
}
