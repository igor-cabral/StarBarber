import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AdminProfile } from '@/services/auth';
import { listAllBarbers } from '@/services/admin';
import {
  listWorkingHours,
  replaceWorkingHours,
  listBlockedTimes,
  createBlockedTime,
  deleteBlockedTime,
} from '@/services/admin';
import { Barber, WorkingHour, BlockedTime } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Trash2 } from 'lucide-react';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function WorkingHoursPage() {
  const { profile } = useOutletContext<{ profile: AdminProfile }>();
  const [barbers, setBarbers] = useState<Barber[] | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [hours, setHours] = useState<Record<number, { active: boolean; start: string; end: string; breakStart: string; breakEnd: string }>>({});
  const [blocked, setBlocked] = useState<BlockedTime[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newBlock, setNewBlock] = useState({ starts_at: '', ends_at: '', reason: '' });

  useEffect(() => {
    listAllBarbers(profile.barbershop_id)
      .then((b) => {
        setBarbers(b);
        if (b[0]) setSelectedBarberId(b[0].id);
      })
      .catch((err) => setError(err.message));
    listBlockedTimes(profile.barbershop_id).then(setBlocked);
  }, [profile.barbershop_id]);

  useEffect(() => {
    if (!selectedBarberId) return;
    listWorkingHours(selectedBarberId).then((wh) => {
      const map: typeof hours = {};
      for (let d = 0; d < 7; d++) {
        const existing = wh.find((h) => h.weekday === d);
        map[d] = existing
          ? {
              active: true,
              start: existing.start_time.slice(0, 5),
              end: existing.end_time.slice(0, 5),
              breakStart: existing.break_start_time?.slice(0, 5) ?? '',
              breakEnd: existing.break_end_time?.slice(0, 5) ?? '',
            }
          : { active: false, start: '09:00', end: '18:00', breakStart: '', breakEnd: '' };
      }
      setHours(map);
    });
  }, [selectedBarberId]);

  async function handleSaveHours() {
    const rows: Omit<WorkingHour, 'id' | 'barber_id'>[] = Object.entries(hours)
      .filter(([, v]) => v.active)
      .map(([weekday, v]) => ({
        weekday: Number(weekday),
        start_time: v.start,
        end_time: v.end,
        break_start_time: v.breakStart || null,
        break_end_time: v.breakEnd || null,
      }));
    await replaceWorkingHours(selectedBarberId, rows);
    alert('Horários salvos.');
  }

  async function handleAddBlock() {
    if (!newBlock.starts_at || !newBlock.ends_at) return;
    await createBlockedTime({
      barbershop_id: profile.barbershop_id,
      barber_id: selectedBarberId || null,
      starts_at: new Date(newBlock.starts_at).toISOString(),
      ends_at: new Date(newBlock.ends_at).toISOString(),
      reason: newBlock.reason || null,
    });
    setNewBlock({ starts_at: '', ends_at: '', reason: '' });
    listBlockedTimes(profile.barbershop_id).then(setBlocked);
  }

  async function handleDeleteBlock(id: string) {
    await deleteBlockedTime(id);
    listBlockedTimes(profile.barbershop_id).then(setBlocked);
  }

  if (error) return <ErrorState message={error} />;
  if (!barbers) return <LoadingState />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Horários</h1>
        <p className="text-sm text-graphite">Configure o expediente semanal e bloqueios de agenda.</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-graphite">Profissional</label>
        <select
          className="rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm"
          value={selectedBarberId}
          onChange={(e) => setSelectedBarberId(e.target.value)}
        >
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <Card className="divide-y divide-zinc-100">
        {WEEKDAYS.map((label, d) => {
          const day = hours[d];
          if (!day) return null;
          return (
            <div key={d} className="flex flex-wrap items-center gap-3 p-4">
              <label className="flex w-32 items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={day.active}
                  onChange={(e) => setHours({ ...hours, [d]: { ...day, active: e.target.checked } })}
                />
                {label}
              </label>
              {day.active && (
                <>
                  <input
                    type="time"
                    value={day.start}
                    onChange={(e) => setHours({ ...hours, [d]: { ...day, start: e.target.value } })}
                    className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  />
                  <span className="text-graphite">até</span>
                  <input
                    type="time"
                    value={day.end}
                    onChange={(e) => setHours({ ...hours, [d]: { ...day, end: e.target.value } })}
                    className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  />
                  <span className="text-xs text-graphite">Almoço:</span>
                  <input
                    type="time"
                    value={day.breakStart}
                    onChange={(e) => setHours({ ...hours, [d]: { ...day, breakStart: e.target.value } })}
                    className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  />
                  <span className="text-graphite">até</span>
                  <input
                    type="time"
                    value={day.breakEnd}
                    onChange={(e) => setHours({ ...hours, [d]: { ...day, breakEnd: e.target.value } })}
                    className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  />
                </>
              )}
            </div>
          );
        })}
      </Card>
      <Button onClick={handleSaveHours} className="w-fit">
        Salvar expediente
      </Button>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Folgas, férias e bloqueios</h2>
        <Card className="mb-4 flex flex-wrap items-end gap-3 p-4">
          <TextField
            label="Início"
            type="datetime-local"
            value={newBlock.starts_at}
            onChange={(e) => setNewBlock({ ...newBlock, starts_at: e.target.value })}
          />
          <TextField
            label="Fim"
            type="datetime-local"
            value={newBlock.ends_at}
            onChange={(e) => setNewBlock({ ...newBlock, ends_at: e.target.value })}
          />
          <TextField
            label="Motivo (opcional)"
            value={newBlock.reason}
            onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
          />
          <Button onClick={handleAddBlock}>Adicionar bloqueio</Button>
        </Card>

        <Card className="divide-y divide-zinc-100">
          {blocked.length === 0 && <p className="p-4 text-sm text-graphite">Nenhum bloqueio cadastrado.</p>}
          {blocked.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium text-ink">{b.reason ?? 'Bloqueio'}</p>
                <p className="text-graphite">
                  {new Date(b.starts_at).toLocaleString('pt-BR')} — {new Date(b.ends_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <button onClick={() => handleDeleteBlock(b.id)} className="text-graphite hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
