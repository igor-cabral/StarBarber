import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Barbershop } from '@/types';
import { useBooking } from '@/components/booking/BookingContext';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPublicAppointment } from '@/services/appointments';
import { formatPrice, formatDuration, formatLongDate, formatTime } from '@/utils/format';

export function StepCustomer({ barbershop }: { barbershop: Barbershop }) {
  const { selection, update } = useBooking();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selection.service || !selection.slot) return;

    const barberId =
      selection.barber === 'any' ? selection.resolvedBarberId : (selection.barber as any)?.id;
    if (!barberId) {
      setError('Selecione um profissional válido.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await createPublicAppointment({
        barbershopId: barbershop.id,
        barberId,
        serviceId: selection.service.id,
        startsAt: selection.slot.slot_start,
        customerName: selection.customerName,
        customerWhatsapp: selection.customerWhatsapp,
        customerEmail: selection.customerEmail,
      });
      navigate(`/agendar/confirmado/${result.code}`);
    } catch (err: any) {
      setError(
        err.message?.includes('reservado')
          ? err.message
          : 'Não foi possível confirmar o agendamento. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!selection.service || !selection.slot) return null;

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl font-semibold tracking-tight">Seus dados</h2>
      <p className="mb-6 text-sm text-graphite">Só precisamos de um jeito de confirmar com você.</p>

      <Card className="mb-6 flex flex-col gap-1.5 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-graphite">Serviço</span>
          <span className="font-medium text-ink">{selection.service.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-graphite">Data</span>
          <span className="font-medium text-ink">{formatLongDate(selection.slot.slot_start)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-graphite">Horário</span>
          <span className="font-medium text-ink">
            {formatTime(selection.slot.slot_start)} · {formatDuration(selection.service.duration_minutes)}
          </span>
        </div>
        <div className="flex justify-between border-t border-zinc-100 pt-1.5">
          <span className="text-graphite">Total</span>
          <span className="font-semibold text-ink">{formatPrice(selection.service.price_cents)}</span>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nome completo"
          required
          value={selection.customerName}
          onChange={(e) => update({ customerName: e.target.value })}
        />
        <TextField
          label="WhatsApp"
          type="tel"
          placeholder="(47) 99999-0000"
          required
          value={selection.customerWhatsapp}
          onChange={(e) => update({ customerWhatsapp: e.target.value })}
        />
        <TextField
          label="E-mail (opcional)"
          type="email"
          value={selection.customerEmail}
          onChange={(e) => update({ customerEmail: e.target.value })}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Confirmando…' : 'Confirmar agendamento'}
        </Button>
      </form>
    </div>
  );
}
