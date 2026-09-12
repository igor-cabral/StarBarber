import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AdminProfile } from '@/services/auth';
import { listAllBarbers, upsertBarber, deleteBarber, setBarberServices, listAllServices } from '@/services/admin';
import { Barber, Service } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

type FormState = (Partial<Barber> & { serviceIds?: string[] }) | null;

export function BarbersPage() {
  const { profile } = useOutletContext<{ profile: AdminProfile }>();
  const [barbers, setBarbers] = useState<Barber[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);

  function reload() {
    listAllBarbers(profile.barbershop_id).then(setBarbers).catch((err) => setError(err.message));
  }

  useEffect(() => {
    reload();
    listAllServices(profile.barbershop_id).then(setServices);
  }, [profile.barbershop_id]);

  async function handleSave() {
    if (!form || !form.name) return;
    const saved = await upsertBarber({
      id: form.id,
      barbershop_id: profile.barbershop_id,
      name: form.name,
      description: form.description ?? null,
      specialties: form.specialties ?? [],
      active: form.active ?? true,
    } as any);
    if (form.serviceIds) {
      await setBarberServices(saved.id, form.serviceIds);
    }
    setForm(null);
    reload();
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este profissional?')) return;
    await deleteBarber(id);
    reload();
  }

  if (error) return <ErrorState message={error} />;
  if (!barbers) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Profissionais</h1>
          <p className="text-sm text-graphite">Gerencie a equipe da barbearia.</p>
        </div>
        <Button onClick={() => setForm({ specialties: [], serviceIds: [] })}>
          <Plus size={16} /> Novo profissional
        </Button>
      </div>

      {barbers.length === 0 ? (
        <EmptyState title="Nenhum profissional cadastrado" />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {barbers.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-ink">
                  {b.name} {!b.active && <span className="ml-2 text-xs text-graphite">(inativo)</span>}
                </p>
                <p className="text-sm text-graphite">{b.specialties.join(', ') || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setForm({ ...b, serviceIds: [] })}>
                  <Pencil size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)}>
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
              <h2 className="font-display text-lg font-semibold">{form.id ? 'Editar profissional' : 'Novo profissional'}</h2>
              <button onClick={() => setForm(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <TextField label="Nome" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField
                label="Descrição"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <TextField
                label="Especialidades (separadas por vírgula)"
                value={form.specialties?.join(', ') ?? ''}
                onChange={(e) =>
                  setForm({ ...form, specialties: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                }
              />
              <div>
                <p className="mb-2 text-sm font-medium text-graphite">Serviços que realiza</p>
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => {
                    const checked = form.serviceIds?.includes(s.id) ?? false;
                    return (
                      <label
                        key={s.id}
                        className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs ${
                          checked ? 'border-accent bg-accent-soft text-ink' : 'border-zinc-200 text-graphite'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={checked}
                          onChange={(e) => {
                            const ids = new Set(form.serviceIds ?? []);
                            if (e.target.checked) ids.add(s.id);
                            else ids.delete(s.id);
                            setForm({ ...form, serviceIds: Array.from(ids) });
                          }}
                        />
                        {s.name}
                      </label>
                    );
                  })}
                </div>
              </div>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
