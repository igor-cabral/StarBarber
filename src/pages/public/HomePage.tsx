import { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Barbershop, Service, Barber } from '@/types';
import { getActiveServices, getActiveBarbers } from '@/services/barbershop';
import { formatPrice, formatDuration } from '@/utils/format';
import { Card } from '@/components/ui/Card';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { MapPin, Instagram, MessageCircle, Clock3 } from 'lucide-react';

export function HomePage() {
  const { barbershop } = useOutletContext<{ barbershop: Barbershop }>();
  const [services, setServices] = useState<Service[] | null>(null);
  const [barbers, setBarbers] = useState<Barber[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getActiveServices(barbershop.id), getActiveBarbers(barbershop.id)])
      .then(([s, b]) => {
        setServices(s);
        setBarbers(b);
      })
      .catch((err) => setError(err.message));
  }, [barbershop.id]);

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-20 sm:py-28">
        <span className="text-sm font-medium text-accent">{barbershop.tagline}</span>
        <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          {barbershop.name}
        </h1>
        {barbershop.description && (
          <p className="max-w-md text-base text-graphite">{barbershop.description}</p>
        )}
        <Link
          to="/agendar"
          className="animate-rise-in rounded-xl bg-ink px-7 py-3.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Agendar horário
        </Link>
      </section>

      {/* Serviços */}
      <section id="servicos" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="mb-8 font-display text-2xl font-semibold tracking-tight">Serviços</h2>
        {error && <ErrorState message={error} />}
        {!services && !error && <LoadingState label="Carregando serviços…" />}
        {services && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <Card key={service.id} className="flex flex-col gap-3 p-5">
                <h3 className="font-medium text-ink">{service.name}</h3>
                {service.description && <p className="text-sm text-graphite">{service.description}</p>}
                <div className="mt-auto flex items-center justify-between pt-2 text-sm">
                  <span className="font-semibold text-ink">{formatPrice(service.price_cents)}</span>
                  <span className="flex items-center gap-1 text-graphite">
                    <Clock3 size={14} /> {formatDuration(service.duration_minutes)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Profissionais */}
      <section id="profissionais" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="mb-8 font-display text-2xl font-semibold tracking-tight">Profissionais</h2>
        {barbers && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {barbers.map((barber) => (
              <Card key={barber.id} className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft font-display text-xl font-semibold text-accent">
                  {barber.photo_url ? (
                    <img src={barber.photo_url} alt={barber.name} className="h-20 w-20 rounded-full object-cover" />
                  ) : (
                    barber.name.charAt(0)
                  )}
                </div>
                <h3 className="font-medium">{barber.name}</h3>
                <p className="text-sm text-graphite">{barber.specialties.join(', ')}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Informações */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Card className="grid grid-cols-1 gap-6 p-8 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            {barbershop.address && (
              <div className="flex items-start gap-3 text-sm text-graphite">
                <MapPin size={18} className="mt-0.5 shrink-0" />
                {barbershop.address}
              </div>
            )}
            {barbershop.whatsapp && (
              <div className="flex items-start gap-3 text-sm text-graphite">
                <MessageCircle size={18} className="mt-0.5 shrink-0" />
                {barbershop.whatsapp}
              </div>
            )}
            {barbershop.instagram && (
              <div className="flex items-start gap-3 text-sm text-graphite">
                <Instagram size={18} className="mt-0.5 shrink-0" />
                {barbershop.instagram}
              </div>
            )}
          </div>
          <div className="flex flex-col items-start justify-center gap-3 sm:items-end">
            <p className="text-sm text-graphite sm:text-right">Pronto para renovar o visual?</p>
            <Link
              to="/agendar"
              className="rounded-xl bg-ink px-6 py-3 text-sm font-medium text-paper hover:opacity-90"
            >
              Agende seu horário
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
