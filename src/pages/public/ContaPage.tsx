import { useEffect, useState } from 'react';
import { Navigate, useOutletContext, Link } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import {
  listMyAppointments,
  cancelMyAppointment,
  exportMyData,
  requestMyDataDeletion,
} from '@/services/customerPortal';
import { customerSignOut } from '@/services/customerAuth';
import { Appointment, Barbershop } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { formatPrice, formatShortDate, formatTime } from '@/utils/format';
import { CustomerRescheduleModal } from '@/components/booking/CustomerRescheduleModal';
import { friendlyError } from '@/utils/errors';

export function ContaPage() {
  const { user, loading: authLoading, status } = useCustomerAuth();
  const { barbershop } = useOutletContext<{ barbershop: Barbershop }>();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);

  function reload() {
    listMyAppointments().then(setAppointments).catch((err) => setError(friendlyError(err, 'Não foi possível carregar seus agendamentos. Tente novamente.')));
  }

  useEffect(() => {
    if (user) reload();
  }, [user]);

  // nunca decide "não logado" enquanto a sessão ainda está carregando
  if (status === 'loading') return <LoadingState label="Carregando sua conta…" />;
  if (status === 'unauthenticated') return <Navigate to="/conta/entrar" state={{ from: '/conta' }} replace />;
  if (!appointments && !error) return <LoadingState label="Carregando seus agendamentos…" />;
  if (error) return <ErrorState message={error} />;

  async function handleCancel(id: string) {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
      await cancelMyAppointment(id);
      reload();
    } catch (err: any) {
      alert(friendlyError(err, 'Não foi possível cancelar.'));
    }
  }

  async function handleDownloadData() {
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meus-dados.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(friendlyError(err, 'Não foi possível gerar o arquivo com seus dados.'));
    }
  }

  async function handleDeleteData() {
    const confirmed = confirm(
      'Isso vai remover permanentemente seu nome, e-mail de contato e WhatsApp associados aos seus agendamentos, e você deixará de ver seu histórico aqui. Esta ação não pode ser desfeita. Deseja continuar?'
    );
    if (!confirmed) return;
    try {
      await requestMyDataDeletion();
      await customerSignOut();
      window.location.href = '/';
    } catch (err) {
      alert(friendlyError(err, 'Não foi possível concluir a exclusão dos seus dados. Tente novamente.'));
    }
  }

  const upcoming = (appointments ?? []).filter(
    (a) => new Date(a.starts_at) >= new Date() && a.status !== 'cancelled' && a.status !== 'completed'
  );
  const past = (appointments ?? []).filter((a) => !upcoming.includes(a));

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Minha conta</h1>
          <p className="text-sm text-graphite">{user?.email}</p>
        </div>
        <button onClick={() => customerSignOut()} className="text-sm text-graphite underline">
          Sair
        </button>
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Próximos agendamentos</h2>
      {upcoming.length === 0 ? (
        <EmptyState title="Nenhum agendamento futuro" description="Que tal marcar um horário?" />
      ) : (
        <Card className="mb-8 divide-y divide-zinc-100">
          {upcoming.map((a) => (
            <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-ink">{a.service?.name}</p>
                <p className="text-sm text-graphite">
                  {formatShortDate(a.starts_at)} · {formatTime(a.starts_at)} · {a.barber?.name}
                </p>
                <StatusBadge status={a.status} />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setRescheduling(a)}>
                  Remarcar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleCancel(a.id)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Histórico</h2>
      {past.length === 0 ? (
        <p className="text-sm text-graphite">Nenhum agendamento anterior ainda.</p>
      ) : (
        <Card className="divide-y divide-zinc-100">
          {past.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium text-ink">{a.service?.name}</p>
                <p className="text-graphite">
                  {formatShortDate(a.starts_at)} · {formatTime(a.starts_at)} · {a.barber?.name}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={a.status} />
                <span className="text-xs text-graphite">{formatPrice(a.price_cents)}</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {rescheduling && (
        <CustomerRescheduleModal
          appointment={rescheduling}
          onClose={() => setRescheduling(null)}
          onDone={() => {
            setRescheduling(null);
            reload();
          }}
        />
      )}

      <h2 className="mb-3 mt-10 font-display text-lg font-semibold tracking-tight">Privacidade</h2>
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Baixar meus dados</p>
            <p className="text-sm text-graphite">Uma cópia em JSON da sua conta e do seu histórico de agendamentos.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleDownloadData}>
            Baixar
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
          <div>
            <p className="text-sm font-medium text-ink">Excluir meus dados</p>
            <p className="text-sm text-graphite">Remove seu nome, e-mail e WhatsApp associados aos agendamentos.</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleDeleteData}>
            Excluir
          </Button>
        </div>
        <p className="text-xs text-graphite">
          Veja também a{' '}
          <Link to="/privacidade" className="underline">
            Política de Privacidade
          </Link>{' '}
          e os{' '}
          <Link to="/termos" className="underline">
            Termos de Uso
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
