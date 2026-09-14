import { useEffect, useState } from 'react';
import { Barbershop, Barber } from '@/types';
import { getBarbersForService } from '@/services/barbershop';
import { Card } from '@/components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { useBooking } from '@/components/booking/BookingContext';
import { Users } from 'lucide-react';
import { friendlyError } from '@/utils/errors';

export function StepBarber({ barbershop, onNext }: { barbershop: Barbershop; onNext: () => void }) {
  const { selection, update } = useBooking();
  const [barbers, setBarbers] = useState<Barber[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selection.service) return;
    getBarbersForService(barbershop.id, selection.service.id)
      .then(setBarbers)
      .catch((err) => setError(friendlyError(err, 'Não foi possível carregar os profissionais. Tente novamente.')));
  }, [barbershop.id, selection.service]);

  function choose(barber: Barber | 'any') {
    update({ barber, date: null, slot: null });
    onNext();
  }

  if (error) return <ErrorState message={error} />;
  if (!barbers) return <LoadingState label="Carregando profissionais…" />;
  if (barbers.length === 0)
    return <EmptyState title="Nenhum profissional disponível para este serviço" description="Escolha outro serviço." />;

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl font-semibold tracking-tight">Escolha o profissional</h2>
      <p className="mb-6 text-sm text-graphite">Com quem você prefere ser atendido?</p>
      <div className="flex flex-col gap-3">
        <Card
          interactive
          onClick={() => choose('any')}
          className={`flex items-center gap-3 p-4 ${selection.barber === 'any' ? 'border-accent ring-1 ring-accent' : ''}`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Users size={20} />
          </div>
          <div>
            <p className="font-medium text-ink">Qualquer profissional</p>
            <p className="text-sm text-graphite">Mostra os horários com mais disponibilidade</p>
          </div>
        </Card>

        {barbers.map((barber) => (
          <Card
            key={barber.id}
            interactive
            onClick={() => choose(barber)}
            className={`flex items-center gap-3 p-4 ${
              typeof selection.barber === 'object' && selection.barber?.id === barber.id
                ? 'border-accent ring-1 ring-accent'
                : ''
            }`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft font-medium text-accent">
              {barber.photo_url ? (
                <img src={barber.photo_url} alt={barber.name} className="h-11 w-11 rounded-full object-cover" />
              ) : (
                barber.name.charAt(0)
              )}
            </div>
            <div>
              <p className="font-medium text-ink">{barber.name}</p>
              <p className="text-sm text-graphite">{barber.specialties.join(', ')}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
