import { useEffect, useState } from 'react';
import { Navigate, useOutletContext, Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, MapPin, Plus, Scissors, UserRound, ShoppingBag, PackageCheck } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import {
  listMyAppointments,
  cancelMyAppointment,
  exportMyData,
  requestMyDataDeletion,
} from '@/services/customerPortal';
import { customerSignOut } from '@/services/customerAuth';
import { Appointment, Barbershop, ProductReservation, Sale } from '@/types';
import { publicPath } from '@/utils/publicPath';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { formatPrice, formatShortDate, formatTime } from '@/utils/format';
import { CustomerRescheduleModal } from '@/components/booking/CustomerRescheduleModal';
import { friendlyError } from '@/utils/errors';
import { cancelMyProductReservation, listMyProductReservations, listMySales } from '@/services/commerce';

export function ContaPage() {
  const { user, status } = useCustomerAuth();
  const { barbershop } = useOutletContext<{ barbershop: Barbershop }>();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [reservations, setReservations] = useState<ProductReservation[] | null>(null);
  const [purchases, setPurchases] = useState<Sale[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);

  function reload() {
    setError(null);
    Promise.all([listMyAppointments(), listMyProductReservations(), listMySales()])
      .then(([appointmentRows, reservationRows, saleRows]) => {
        setAppointments(appointmentRows);
        setReservations(reservationRows);
        setPurchases(saleRows);
      })
      .catch((err) => setError(friendlyError(err, 'Não foi possível carregar sua conta. Tente novamente.')));
  }

  useEffect(() => {
    if (user) reload();
  }, [user]);

  if (status === 'loading') return <LoadingState label="Carregando sua conta…" />;
  if (status === 'unauthenticated') {
    return <Navigate to={publicPath(barbershop.slug, '/conta/entrar')} state={{ from: publicPath(barbershop.slug, '/conta') }} replace />;
  }
  if ((!appointments || !reservations || !purchases) && !error) return <LoadingState label="Carregando sua conta…" />;
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
      window.location.href = publicPath(barbershop.slug);
    } catch (err) {
      alert(friendlyError(err, 'Não foi possível concluir a exclusão dos seus dados. Tente novamente.'));
    }
  }

  const now = new Date();
  const upcoming = (appointments ?? [])
    .filter((a) => new Date(a.starts_at) >= now && a.status !== 'cancelled' && a.status !== 'completed')
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const upcomingIds = new Set(upcoming.map((a) => a.id));
  const past = (appointments ?? [])
    .filter((a) => !upcomingIds.has(a.id))
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  const nextAppointment = upcoming[0];
  const firstName = user?.fullName?.trim().split(/\s+/)[0] || 'cliente';

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <section className="overflow-hidden rounded-[24px] border border-zinc-200 bg-ink text-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.45)]">
        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium text-accent">Minha conta</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Olá, {firstName}.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                Aqui você acompanha seus próximos horários e pode marcar um novo atendimento quando quiser.
              </p>
            </div>
            <Link
              to={publicPath(barbershop.slug, '/agendar')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              <Plus size={17} />
              Agendar novo horário
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Sua agenda</p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">Próximos agendamentos</h2>
          </div>
          {upcoming.length > 0 && (
            <Link to={publicPath(barbershop.slug, '/agendar')} className="hidden items-center gap-1.5 text-sm font-medium text-ink hover:underline sm:flex">
              Marcar outro <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {nextAppointment ? (
          <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
            <Card className="overflow-hidden border-accent/30 bg-accent-soft p-0">
              <div className="flex flex-col gap-6 p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                      <CalendarClock size={15} /> Próximo horário
                    </div>
                    <h3 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                      {formatShortDate(nextAppointment.starts_at)}
                    </h3>
                    <p className="mt-1 text-base text-graphite">às {formatTime(nextAppointment.starts_at)}</p>
                  </div>
                  <StatusBadge status={nextAppointment.status} />
                </div>

                <div className="grid gap-3 border-t border-black/5 pt-5 sm:grid-cols-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Scissors size={16} className="text-accent" />
                    <span>{nextAppointment.service?.name ?? 'Serviço'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UserRound size={16} className="text-accent" />
                    <span>{nextAppointment.barber?.name ?? 'Profissional'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock3 size={16} className="text-accent" />
                    <span>{formatPrice(nextAppointment.price_cents)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={() => setRescheduling(nextAppointment)}>Remarcar</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleCancel(nextAppointment.id)}>Cancelar</Button>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {upcoming.slice(1, 3).map((a) => (
                <Card key={a.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-graphite">Próximo</p>
                      <h3 className="mt-1 font-medium text-ink">{a.service?.name}</h3>
                      <p className="mt-1 text-sm text-graphite">{formatShortDate(a.starts_at)} · {formatTime(a.starts_at)}</p>
                      <p className="mt-1 text-sm text-graphite">{a.barber?.name}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                </Card>
              ))}
              {upcoming.length === 1 && (
                <Card className="flex min-h-[130px] flex-col justify-between border-dashed bg-zinc-50 p-5">
                  <p className="text-sm text-graphite">Quer aproveitar e já deixar outro horário marcado?</p>
                  <Link to={publicPath(barbershop.slug, '/agendar')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <Plus size={15} /> Agendar outro
                  </Link>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card className="border-dashed bg-zinc-50 p-7">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 font-medium text-ink"><CheckCircle2 size={18} className="text-accent" /> Sua agenda está livre.</p>
                <p className="mt-1 text-sm text-graphite">Escolha um serviço e reserve seu próximo horário.</p>
              </div>
              <Link to={publicPath(barbershop.slug, '/agendar')} className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">
                <Plus size={17} /> Agendar horário
              </Link>
            </div>
          </Card>
        )}
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-graphite">Agendamentos futuros</p>
          <p className="mt-2 font-display text-3xl font-semibold">{upcoming.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-graphite">Atendimentos anteriores</p>
          <p className="mt-2 font-display text-3xl font-semibold">{past.length}</p>
        </Card>
        <Card className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><MapPin size={18} /></div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-graphite">Local</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium">{barbershop.address ?? barbershop.name}</p>
          </div>
        </Card>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Loja</p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">Minhas reservas</h2>
          </div>
          <Link to={publicPath(barbershop.slug, '/loja')} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:underline">
            Ver produtos <ArrowRight size={15} />
          </Link>
        </div>
        {reservations!.length === 0 ? (
          <Card className="flex flex-col gap-4 border-dashed bg-zinc-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="flex items-center gap-2 font-medium"><ShoppingBag size={18} className="text-accent"/> Nenhuma reserva de produto.</p><p className="mt-1 text-sm text-graphite">Você pode reservar itens da barbearia e retirar no local.</p></div>
            <Link to={publicPath(barbershop.slug, '/loja')} className="rounded-xl bg-ink px-4 py-2.5 text-center text-sm font-medium text-paper">Abrir loja</Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reservations!.map((r) => {
              const total = (r.items ?? []).reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);
              const statusLabel = { reserved: 'Reservado', ready: 'Pronto para retirar', fulfilled: 'Retirado', cancelled: 'Cancelado', expired: 'Expirado' }[r.status];
              return <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-medium uppercase tracking-[0.12em] text-graphite">{r.code}</p><h3 className="mt-1 font-medium">{statusLabel}</h3></div>
                  <PackageCheck size={20} className="text-accent"/>
                </div>
                <div className="mt-4 space-y-2">{r.items?.map(i => <div key={i.id} className="flex items-center justify-between gap-3 text-sm"><span>{i.quantity}× {i.product?.name ?? i.description ?? 'Produto'}</span><span className="text-graphite">{formatPrice(i.unit_price_cents * i.quantity)}</span></div>)}</div>
                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4"><span className="font-semibold">{formatPrice(total)}</span>{(r.status === 'reserved' || r.status === 'ready') && <Button size="sm" variant="ghost" onClick={async()=>{if(confirm('Cancelar esta reserva?')){try{await cancelMyProductReservation(r.id);reload()}catch(err){alert(friendlyError(err,'Não foi possível cancelar a reserva.'))}}}}>Cancelar reserva</Button>}</div>
              </Card>
            })}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">Minhas compras</h2>
        {purchases!.length === 0 ? (
          <EmptyState title="Nenhuma compra vinculada à sua conta" description="Compras registradas no caixa com seu cadastro aparecerão aqui." />
        ) : (
          <Card className="divide-y divide-zinc-100">
            {purchases!.map((sale) => <div key={sale.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-medium">{sale.items?.map(i => `${i.quantity}× ${i.description}`).join(' · ') || 'Compra'}</p><p className="text-sm text-graphite">{new Date(sale.created_at).toLocaleString('pt-BR')}</p></div>
              <span className="font-semibold">{formatPrice(sale.total_cents)}</span>
            </div>)}
          </Card>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">Histórico</h2>
        {past.length === 0 ? (
          <EmptyState title="Nenhum agendamento anterior" description="Seus atendimentos concluídos aparecerão aqui." />
        ) : (
          <Card className="divide-y divide-zinc-100">
            {past.map((a) => (
              <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-ink">{a.service?.name}</p>
                  <p className="text-sm text-graphite">{formatShortDate(a.starts_at)} · {formatTime(a.starts_at)} · {a.barber?.name}</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <StatusBadge status={a.status} />
                  <span className="text-xs text-graphite">{formatPrice(a.price_cents)}</span>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

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

      <section className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">Privacidade</h2>
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Baixar meus dados</p>
              <p className="text-sm text-graphite">Uma cópia em JSON da sua conta e do seu histórico de agendamentos.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleDownloadData}>Baixar</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
            <div>
              <p className="text-sm font-medium text-ink">Excluir meus dados</p>
              <p className="text-sm text-graphite">Remove seu nome, e-mail e WhatsApp associados aos agendamentos.</p>
            </div>
            <Button variant="danger" size="sm" onClick={handleDeleteData}>Excluir</Button>
          </div>
          <p className="text-xs text-graphite">
            Veja também a <Link to={publicPath(barbershop.slug, '/privacidade')} className="underline">Política de Privacidade</Link> e os <Link to={publicPath(barbershop.slug, '/termos')} className="underline">Termos de Uso</Link>.
          </p>
        </Card>
      </section>
    </div>
  );
}
