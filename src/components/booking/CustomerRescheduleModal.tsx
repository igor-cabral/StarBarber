import { useEffect, useState } from 'react';
import { Appointment } from '@/types';
import { getAvailableSlots } from '@/services/availability';
import { rescheduleMyAppointment } from '@/services/customerPortal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatTime } from '@/utils/format';
import { X } from 'lucide-react';
import { friendlyError } from '@/utils/errors';

function next14Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

export function CustomerRescheduleModal({
  appointment,
  onClose,
  onDone,
}: {
  appointment: Appointment;
  onClose: () => void;
  onDone: () => void;
}) {
  const days = next14Days();
  const [date, setDate] = useState(days[0].toISOString().slice(0, 10));
  const [slots, setSlots] = useState<{ slot_start: string; slot_end: string }[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSlots(null);
    getAvailableSlots(appointment.barber_id, appointment.service_id, date)
      .then(setSlots)
      .catch((err) => setError(friendlyError(err, 'Não foi possível carregar os horários.')));
  }, [appointment.barber_id, appointment.service_id, date]);

  async function choose(slotStart: string) {
    setSaving(true);
    setError(null);
    try {
      await rescheduleMyAppointment(appointment.id, slotStart);
      onDone();
    } catch (err: any) {
      setError(friendlyError(err, 'Não foi possível remarcar.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Remarcar horário</h2>
          <button onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <p className="mb-3 text-sm text-graphite">
          {appointment.service?.name} com {appointment.barber?.name}
        </p>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => {
            const iso = d.toISOString().slice(0, 10);
            return (
              <button
                key={iso}
                onClick={() => setDate(iso)}
                className={`shrink-0 rounded-lg border px-3 py-2 text-xs ${
                  date === iso ? 'border-accent bg-accent-soft' : 'border-zinc-200 text-graphite'
                }`}
              >
                {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </button>
            );
          })}
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {!slots && <LoadingState label="Verificando horários…" />}
        {slots && slots.length === 0 && <EmptyState title="Nenhum horário livre neste dia" />}
        {slots && slots.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => (
              <Button
                key={s.slot_start}
                variant="secondary"
                size="sm"
                disabled={saving}
                onClick={() => choose(s.slot_start)}
              >
                {formatTime(s.slot_start)}
              </Button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
