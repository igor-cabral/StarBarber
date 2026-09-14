import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShopStaffProfile } from '@/services/auth';
import { listAppointments } from '@/services/appointments';
import { Appointment } from '@/types';
import { Card } from '@/components/ui/Card';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatPrice, formatTime } from '@/utils/format';
import { friendlyError } from '@/utils/errors';

export function DashboardPage() {
  const { profile } = useOutletContext<{ profile: ShopStaffProfile }>();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }, []);

  useEffect(() => {
    listAppointments({
      barbershopId: profile.barbershop_id,
      from,
      to,
      barberId: profile.role === 'barbeiro' ? profile.barber_id ?? undefined : undefined,
    })
      .then(setAppointments)
      .catch((err) => setError(friendlyError(err, 'Não foi possível carregar o dashboard. Tente novamente.')));
  }, [profile.barbershop_id, profile.role, profile.barber_id, from, to]);

  if (error) return <ErrorState message={error} />;
  if (!appointments) return <LoadingState label="Carregando dashboard…" />;

  const confirmed = appointments.filter((a) => a.status === 'confirmed');
  const pending = appointments.filter((a) => a.status === 'pending');
  const cancelled = appointments.filter((a) => a.status === 'cancelled' || a.status === 'no_show');
  const revenue = appointments
    .filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
    .reduce((sum, a) => sum + a.price_cents, 0);

  const upcoming = appointments
    .filter((a) => new Date(a.starts_at) >= new Date() && a.status !== 'cancelled')
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Hoje</h1>
        <p className="text-sm text-graphite">Resumo dos agendamentos de hoje.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Metric label="Agendamentos" value={appointments.length} />
        <Metric label="Confirmados" value={confirmed.length} />
        <Metric label="Pendentes" value={pending.length} />
        <Metric label="Cancelados" value={cancelled.length} />
        <Metric label="Faturamento" value={formatPrice(revenue)} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Próximos horários</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-graphite">Nenhum horário restante para hoje.</p>
        ) : (
          <Card className="divide-y divide-zinc-100">
            {upcoming.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <span className="w-14 font-medium text-ink">{formatTime(a.starts_at)}</span>
                  <div>
                    <p className="text-sm font-medium text-ink">{a.barber?.name}</p>
                    <p className="text-sm text-graphite">{a.service?.name}</p>
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-graphite">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </Card>
  );
}
