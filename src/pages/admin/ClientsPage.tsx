import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShopStaffProfile } from '@/services/auth';
import { listCustomers } from '@/services/admin';
import { listAppointments } from '@/services/appointments';
import { Customer, Appointment } from '@/types';
import { Card } from '@/components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatPrice, formatShortDate, formatTime } from '@/utils/format';
import { X } from 'lucide-react';
import { friendlyError } from '@/utils/errors';

export function ClientsPage() {
  const { profile } = useOutletContext<{ profile: ShopStaffProfile }>();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);

  useEffect(() => {
    Promise.all([listCustomers(profile.barbershop_id), listAppointments({ barbershopId: profile.barbershop_id })])
      .then(([c, a]) => {
        setCustomers(c);
        setAllAppointments(a);
      })
      .catch((err) => setError(friendlyError(err, 'Não foi possível carregar os clientes. Tente novamente.')));
  }, [profile.barbershop_id]);

  function historyFor(customerId: string): Appointment[] {
    return allAppointments
      .filter((a) => a.customer_id === customerId)
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  }

  if (error) return <ErrorState message={error} />;
  if (!customers) return <LoadingState />;
  if (customers.length === 0) return <EmptyState title="Nenhum cliente cadastrado ainda" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-graphite">Base de clientes que já agendaram na barbearia.</p>
      </div>

      <Card className="divide-y divide-zinc-100">
        {customers.map((c) => {
          const history = historyFor(c.id);
          const last = history[0];
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-zinc-50"
            >
              <div>
                <p className="text-sm font-medium text-ink">{c.name}</p>
                <p className="text-sm text-graphite">{c.whatsapp}</p>
              </div>
              <div className="text-right text-sm text-graphite">
                <p>{history.length} agendamento(s)</p>
                {last && <p>Último: {formatShortDate(last.starts_at)}</p>}
              </div>
            </button>
          );
        })}
      </Card>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[80vh] w-full max-w-lg overflow-y-auto p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">{selected.name}</h2>
                <p className="text-sm text-graphite">
                  {selected.whatsapp} {selected.email ? `· ${selected.email}` : ''}
                </p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <h3 className="mb-2 text-sm font-medium text-graphite">Histórico completo</h3>
            <div className="flex flex-col gap-2">
              {historyFor(selected.id).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-zinc-100 p-3 text-sm">
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
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
