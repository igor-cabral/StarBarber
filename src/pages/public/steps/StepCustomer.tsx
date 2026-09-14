import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Barbershop } from '@/types';
import { useBooking } from '@/components/booking/BookingContext';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/States';
import { createCustomerAppointment } from '@/services/customerBooking';
import { formatPrice, formatDuration, formatLongDate, formatTime } from '@/utils/format';
import { friendlyError } from '@/utils/errors';

export function StepCustomer({ barbershop }: { barbershop: Barbershop }) {
  const { selection, update } = useBooking();
  const { user, loading: authLoading } = useCustomerAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pré-preenche com os dados da conta assim que o cliente loga
  useEffect(() => {
    if (user && !selection.customerName) {
      update({
        customerName: user.fullName ?? '',
        customerWhatsapp: user.phone ?? '',
        customerEmail: user.email ?? '',
      });
    }
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selection.service || !selection.slot) return;

    const barberId =
      selection.barber === 'any' || !selection.barber ? selection.resolvedBarberId : selection.barber.id;
    if (!barberId) {
      setError('Selecione um profissional válido.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await createCustomerAppointment({
        barbershopId: barbershop.id,
        barberId,
        serviceId: selection.service.id,
        startsAt: selection.slot.slot_start,
        customerName: selection.customerName,
        customerWhatsapp: selection.customerWhatsapp,
      });
      navigate(`/agendar/confirmado/${result.code}`);
    } catch (err: any) {
      setError(
        friendlyError(
          err,
          'Não foi possível confirmar o agendamento. Verifique sua conexão e tente novamente — se o problema continuar, escolha outro horário.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!selection.service || !selection.slot) return null;

  if (authLoading) return <LoadingState label="Verificando sua conta…" />;

  // Exige login/cadastro antes de mostrar o formulário final —
  // assim que autenticado, o próprio componente volta a renderizar
  // com o formulário abaixo (o estado de auth é reativo).
  if (!user) {
    return (
      <div>
        <h2 className="mb-1 font-display text-2xl font-semibold tracking-tight">Falta pouco!</h2>
        <p className="mb-6 text-sm text-graphite">
          Entre ou crie sua conta para confirmar o agendamento e poder gerenciá-lo depois.
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/conta/entrar" state={{ from: '/agendar' }}>
            <Button size="lg" fullWidth>
              Entrar
            </Button>
          </Link>
          <Link to="/conta/cadastro" state={{ from: '/agendar' }}>
            <Button variant="secondary" size="lg" fullWidth>
              Criar conta
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl font-semibold tracking-tight">Confirme seus dados</h2>
      <p className="mb-6 text-sm text-graphite">Revise e confirme para concluir o agendamento.</p>

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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Confirmando…' : 'Confirmar agendamento'}
        </Button>
      </form>
    </div>
  );
}
