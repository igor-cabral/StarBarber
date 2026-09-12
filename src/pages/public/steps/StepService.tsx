import { useEffect, useState } from 'react';
import { Barbershop, Service } from '@/types';
import { getActiveServices } from '@/services/barbershop';
import { formatPrice, formatDuration } from '@/utils/format';
import { Card } from '@/components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { useBooking } from '@/components/booking/BookingContext';
import { Clock3 } from 'lucide-react';

export function StepService({ barbershop, onNext }: { barbershop: Barbershop; onNext: () => void }) {
  const { selection, update } = useBooking();
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActiveServices(barbershop.id).then(setServices).catch((err) => setError(err.message));
  }, [barbershop.id]);

  function choose(service: Service) {
    update({ service, barber: null, date: null, slot: null });
    onNext();
  }

  if (error) return <ErrorState message={error} />;
  if (!services) return <LoadingState label="Carregando serviços…" />;
  if (services.length === 0)
    return <EmptyState title="Nenhum serviço disponível" description="Volte mais tarde ou fale com a barbearia." />;

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl font-semibold tracking-tight">Escolha o serviço</h2>
      <p className="mb-6 text-sm text-graphite">Selecione o que você quer fazer hoje.</p>
      <div className="flex flex-col gap-3">
        {services.map((service) => (
          <Card
            key={service.id}
            interactive
            onClick={() => choose(service)}
            className={`flex items-center justify-between p-4 ${
              selection.service?.id === service.id ? 'border-accent ring-1 ring-accent' : ''
            }`}
          >
            <div>
              <p className="font-medium text-ink">{service.name}</p>
              <p className="flex items-center gap-1 text-sm text-graphite">
                <Clock3 size={14} /> {formatDuration(service.duration_minutes)}
              </p>
            </div>
            <span className="font-semibold text-ink">{formatPrice(service.price_cents)}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
