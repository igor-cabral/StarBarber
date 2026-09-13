import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { AppNotification } from '@/types';
import { listNotifications, countUnreadNotifications, markAllNotificationsRead } from '@/services/notifications';
import { formatShortDate, formatTime } from '@/utils/format';

const NOTIFICATION_LABELS: Record<string, string> = {
  new: 'Novo agendamento',
  cancelled: 'Agendamento cancelado',
  rescheduled: 'Agendamento remarcado',
};

export function NotificationBell({ barbershopId }: { barbershopId: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[] | null>(null);

  async function refreshCount() {
    try {
      setUnread(await countUnreadNotifications(barbershopId));
    } catch {
      /* silencioso: notificação não é crítica para o uso do painel */
    }
  }

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, [barbershopId]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      const list = await listNotifications(barbershopId);
      setItems(list);
      if (unread > 0) {
        await markAllNotificationsRead(barbershopId);
        setUnread(0);
      }
    }
  }

  return (
    <div className="relative">
      <button onClick={toggleOpen} className="relative rounded-lg p-2 text-graphite hover:bg-zinc-100 hover:text-ink" aria-label="Notificações">
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
            <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-graphite">Notificações</p>
            <div className="max-h-80 overflow-y-auto">
              {!items && <p className="px-2 py-4 text-sm text-graphite">Carregando…</p>}
              {items && items.length === 0 && <p className="px-2 py-4 text-sm text-graphite">Nenhuma notificação ainda.</p>}
              {items?.map((n) => (
                <div key={n.id} className="rounded-lg px-2 py-2 hover:bg-zinc-50">
                  <p className="text-sm font-medium text-ink">{NOTIFICATION_LABELS[n.type] ?? n.type}</p>
                  <p className="text-xs text-graphite">{n.message}</p>
                  <p className="mt-0.5 text-[11px] text-graphite">
                    {formatShortDate(n.created_at)} · {formatTime(n.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
