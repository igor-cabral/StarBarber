import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShopStaffProfile } from '@/services/auth';
import { listAppointments, updateAppointmentStatus } from '@/services/appointments';
import { Appointment, AppointmentStatus } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatPrice, formatShortDate, formatTime } from '@/utils/format';
import { RescheduleModal } from '@/components/admin/RescheduleModal';
import { CalendarClock, Ban } from 'lucide-react';
import { friendlyError } from '@/utils/errors';

const STATUS_FILTERS: { value: AppointmentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'cancelled', label: 'Cancelados' },
];

export function AppointmentsPage() {
  const { profile } = useOutletContext<{ profile: ShopStaffProfile }>();
  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all');
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);

  function reload() {
    listAppointments({
      barbershopId: profile.barbershop_id,
      status: filter === 'all' ? undefined : filter,
      barberId: profile.role === 'barbeiro' ? profile.barber_id ?? undefined : undefined,
    })
      .then(setAppointments)
      .catch((err) => setError(friendlyError(err, 'Não foi possível carregar os agendamentos. Tente novamente.')));
  }

  useEffect(reload, [profile.barbershop_id, profile.role, profile.barber_id, filter]);

  async function handleCancel(id: string) {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
      await updateAppointmentStatus(id, 'cancelled');
      reload();
    } catch (err: any) {
      alert(friendlyError(err, 'Não foi possível cancelar.'));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Agendamentos</h1>
        <p className="text-sm text-graphite">Histórico completo de agendamentos da barbearia.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value ? 'bg-ink text-paper' : 'bg-white text-graphite hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} />}
      {!appointments && !error && <LoadingState />}
      {appointments && appointments.length === 0 && <EmptyState title="Nenhum agendamento encontrado" />}
      {appointments && appointments.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-graphite">
              <tr>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Serviço</th>
                <th className="px-4 py-3 font-medium">Profissional</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {appointments.map((a) => {
                const canManage = a.status !== 'cancelled' && a.status !== 'completed' && a.status !== 'no_show';
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                    <td className="px-4 py-3">{a.customer?.name}</td>
                    <td className="px-4 py-3">{a.service?.name}</td>
                    <td className="px-4 py-3">{a.barber?.name}</td>
                    <td className="px-4 py-3">
                      {formatShortDate(a.starts_at)} · {formatTime(a.starts_at)}
                    </td>
                    <td className="px-4 py-3">{formatPrice(a.price_cents)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      {canManage && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setRescheduling(a)}>
                            <CalendarClock size={15} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(a.id)}>
                            <Ban size={15} />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {rescheduling && (
        <RescheduleModal
          appointment={rescheduling}
          onClose={() => setRescheduling(null)}
          onDone={() => {
            setRescheduling(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
