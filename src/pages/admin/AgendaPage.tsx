import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AdminProfile } from '@/services/auth';
import { listAppointments, updateAppointmentStatus } from '@/services/appointments';
import { Appointment, AppointmentStatus } from '@/types';
import { Card } from '@/components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { formatShortDate, formatTime } from '@/utils/format';

type ViewMode = 'day' | 'week' | 'list';

export function AgendaPage() {
  const { profile } = useOutletContext<{ profile: AdminProfile }>();
  const [view, setView] = useState<ViewMode>('day');
  const [refDate, setRefDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = getRange(view, refDate);

  useEffect(() => {
    setAppointments(null);
    listAppointments({ barbershopId: profile.barbershop_id, from, to })
      .then(setAppointments)
      .catch((err) => setError(err.message));
  }, [profile.barbershop_id, from, to]);

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    await updateAppointmentStatus(id, status);
    setAppointments((prev) => (prev ? prev.map((a) => (a.id === id ? { ...a, status } : a)) : prev));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-graphite">Visualize e gerencie os agendamentos.</p>
        </div>
        <div className="flex gap-2">
          {(['day', 'week', 'list'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v ? 'bg-ink text-paper' : 'bg-white text-graphite hover:text-ink'
              }`}
            >
              {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Lista'}
            </button>
          ))}
        </div>
      </div>

      {view !== 'list' && (
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setRefDate(shiftDate(refDate, view, -1))}>
            ←
          </Button>
          <span className="text-sm font-medium text-ink">{formatShortDate(refDate.toISOString())}</span>
          <Button variant="secondary" size="sm" onClick={() => setRefDate(shiftDate(refDate, view, 1))}>
            →
          </Button>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {!appointments && !error && <LoadingState label="Carregando agenda…" />}
      {appointments && appointments.length === 0 && (
        <EmptyState title="Nenhum agendamento neste período" />
      )}
      {appointments && appointments.length > 0 && (
        <Card className="divide-y divide-zinc-100">
          {appointments.map((a) => (
            <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 text-sm">
                  <p className="font-medium text-ink">{formatTime(a.starts_at)}</p>
                  {view !== 'day' && <p className="text-xs text-graphite">{formatShortDate(a.starts_at)}</p>}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{a.customer?.name}</p>
                  <p className="text-sm text-graphite">
                    {a.service?.name} · {a.barber?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} />
                <select
                  className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-ink"
                  value={a.status}
                  onChange={(e) => handleStatusChange(a.id, e.target.value as AppointmentStatus)}
                >
                  <option value="pending">Pendente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="in_progress">Em atendimento</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="no_show">Não compareceu</option>
                </select>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function getRange(view: ViewMode, ref: Date): { from: string; to: string } {
  const start = new Date(ref);
  const end = new Date(ref);

  if (view === 'day') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (view === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else {
    // lista: próximos 30 dias
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 30);
    end.setHours(23, 59, 59, 999);
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

function shiftDate(date: Date, view: ViewMode, dir: 1 | -1): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + dir * (view === 'week' ? 7 : 1));
  return d;
}
