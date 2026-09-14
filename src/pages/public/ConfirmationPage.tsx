import { useEffect, useState } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import { publicPath } from '@/utils/publicPath';
import { Barbershop, Appointment } from '@/types';
import { getAppointmentByCode } from '@/services/appointments';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatLongDate, formatTime, formatPrice, buildWhatsappLink } from '@/utils/format';
import { CheckCircle2, CalendarPlus, MessageCircle } from 'lucide-react';
import { friendlyError } from '@/utils/errors';

export function ConfirmationPage() {
  const { code } = useParams<{ code: string }>();
  const { barbershop } = useOutletContext<{ barbershop: Barbershop }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    getAppointmentByCode(code)
      .then((a) => {
        if (!a) setError('Agendamento não encontrado.');
        else setAppointment(a);
      })
      .catch((err) => setError(friendlyError(err, 'Não foi possível carregar a confirmação. Tente novamente.')));
  }, [code]);

  if (error) return <ErrorState message={error} />;
  if (!appointment) return <LoadingState label="Carregando confirmação…" />;

  const whatsappMessage = `Olá! Gostaria de confirmar meu agendamento na ${barbershop.name}.\n\nServiço: ${appointment.service?.name}\nProfissional: ${appointment.barber?.name}\nData: ${formatLongDate(appointment.starts_at)}\nHorário: ${formatTime(appointment.starts_at)}\nCódigo: ${appointment.code}`;

  function downloadIcs() {
    if (!appointment) return;
    const start = new Date(appointment.starts_at).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(appointment.ends_at).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${appointment.service?.name} — ${barbershop.name}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `DESCRIPTION:Código do agendamento: ${appointment.code}`,
      `LOCATION:${barbershop.address ?? ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agendamento-${appointment.code}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 size={30} />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Agendamento confirmado!</h1>
      <p className="mt-1 text-sm text-graphite">Enviamos os detalhes abaixo — guarde seu código.</p>

      <Card className="mt-6 w-full p-6 text-left">
        <p className="mb-4 text-lg font-medium">{appointment.service?.name}</p>
        <dl className="flex flex-col gap-2 text-sm">
          <Row label="Profissional" value={appointment.barber?.name ?? '—'} />
          <Row label="Data" value={formatLongDate(appointment.starts_at)} />
          <Row label="Horário" value={formatTime(appointment.starts_at)} />
          <Row label="Cliente" value={appointment.customer?.name ?? '—'} />
          <Row label="Telefone" value={appointment.customer?.whatsapp ?? '—'} />
          <Row label="Valor" value={formatPrice(appointment.price_cents)} />
        </dl>
        <div className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-center font-mono text-sm font-semibold tracking-wide text-ink">
          {appointment.code}
        </div>
      </Card>

      <div className="mt-6 flex w-full flex-col gap-3">
        <Button variant="secondary" size="lg" onClick={downloadIcs}>
          <CalendarPlus size={18} /> Adicionar ao calendário
        </Button>
        {barbershop.whatsapp && (
          <a href={buildWhatsappLink(barbershop.whatsapp, whatsappMessage)} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="lg" fullWidth>
              <MessageCircle size={18} /> Falar pelo WhatsApp
            </Button>
          </a>
        )}
        <Link to={publicPath(barbershop.slug)}>
          <Button variant="ghost" size="lg" fullWidth>
            Voltar para o início
          </Button>
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-graphite">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
