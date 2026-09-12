import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AdminProfile } from '@/services/auth';
import { listAllServices, upsertService, deleteService } from '@/services/admin';
import { Service } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { formatPrice, formatDuration } from '@/utils/format';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

type FormState = Partial<Service> | null;

export function ServicesPage() {
  const { profile } = useOutletContext<{ profile: AdminProfile }>();
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);

  function reload() {
    listAllServices(profile.barbershop_id).then(setServices).catch((err) => setError(err.message));
  }

  useEffect(reload, [profile.barbershop_id]);

  async function handleSave() {
    if (!form || !form.name || form.price_cents == null || form.duration_minutes == null) return;
    await upsertService({ ...form, barbershop_id: profile.barbershop_id } as any);
    setForm(null);
    reload();
  }

  async function handleToggleActive(service: Service) {
    await upsertService({ id: service.id, barbershop_id: profile.barbershop_id, active: !service.active });
    reload();
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este serviço permanentemente?')) return;
    await deleteService(id);
    reload();
  }

  if (error) return <ErrorState message={error} />;
  if (!services) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Serviços</h1>
          <p className="text-sm text-graphite">Gerencie o catálogo de serviços da barbearia.</p>
        </div>
        <Button onClick={() => setForm({})}>
          <Plus size={16} /> Novo serviço
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState title="Nenhum serviço cadastrado" description="Crie o primeiro serviço para começar a receber agendamentos." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-ink">
                  {s.name} {!s.active && <span className="ml-2 text-xs text-graphite">(inativo)</span>}
                </p>
                <p className="text-sm text-graphite">
                  {formatPrice(s.price_cents)} · {formatDuration(s.duration_minutes)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleToggleActive(s)}>
                  {s.active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setForm(s)}>
                  <Pencil size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">{form.id ? 'Editar serviço' : 'Novo serviço'}</h2>
              <button onClick={() => setForm(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <TextField
                label="Nome"
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <TextField
                label="Descrição"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <TextField
                label="Preço (R$)"
                type="number"
                step="0.01"
                value={form.price_cents != null ? (form.price_cents / 100).toString() : ''}
                onChange={(e) => setForm({ ...form, price_cents: Math.round(Number(e.target.value) * 100) })}
              />
              <TextField
                label="Duração (minutos)"
                type="number"
                value={form.duration_minutes?.toString() ?? ''}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              />
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
