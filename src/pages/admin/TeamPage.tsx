import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShopStaffProfile } from '@/services/auth';
import { createInvite, listInvites, revokeInvite, buildInviteLink } from '@/services/invites';
import { listAllBarbers } from '@/services/admin';
import { removeStaffAccess } from '@/services/master';
import { supabase } from '@/lib/supabase';
import { Invite, Barber } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Copy, Trash2 } from 'lucide-react';
import { friendlyError } from '@/utils/errors';

interface StaffRow {
  id: string;
  full_name: string | null;
  role: string;
  barber_id: string | null;
}

export function TeamPage() {
  const { profile } = useOutletContext<{ profile: ShopStaffProfile }>();
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [staff, setStaff] = useState<StaffRow[] | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'caixa' | 'barbeiro'>('caixa');
  const [barberId, setBarberId] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function reload() {
    listInvites(profile.barbershop_id).then(setInvites).catch((err) => setError(friendlyError(err, 'Não foi possível carregar a equipe. Tente novamente.')));
    supabase
      .from('profiles')
      .select('id, full_name, role, barber_id')
      .eq('barbershop_id', profile.barbershop_id)
      .neq('role', 'admin')
      .then(({ data }) => setStaff((data as StaffRow[]) ?? []));
  }

  useEffect(() => {
    reload();
    listAllBarbers(profile.barbershop_id).then(setBarbers);
  }, [profile.barbershop_id]);

  async function handleCreateInvite() {
    try {
      await createInvite({
        barbershopId: profile.barbershop_id,
        role,
        barberId: role === 'barbeiro' ? barberId || undefined : undefined,
      });
      setBarberId('');
      reload();
    } catch (err: any) {
      alert(friendlyError(err, 'Não foi possível criar o convite.'));
    }
  }

  async function handleCopy(invite: Invite) {
    await navigator.clipboard.writeText(buildInviteLink(invite.token));
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleRevoke(id: string) {
    if (!confirm('Cancelar este convite?')) return;
    await revokeInvite(id);
    reload();
  }

  async function handleRemoveStaff(id: string) {
    if (!confirm('Remover o acesso deste usuário ao painel?')) return;
    await removeStaffAccess(id);
    reload();
  }

  if (error) return <ErrorState message={error} />;
  if (!invites || !staff) return <LoadingState />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Equipe</h1>
        <p className="text-sm text-graphite">Convide operadores de caixa e profissionais para acessarem o painel.</p>
      </div>

      <Card className="flex flex-wrap items-end gap-3 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-graphite">Papel</label>
          <select
            className="rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as 'caixa' | 'barbeiro')}
          >
            <option value="caixa">Caixa</option>
            <option value="barbeiro">Profissional (barbeiro)</option>
          </select>
        </div>
        {role === 'barbeiro' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-graphite">Vincular ao profissional</label>
            <select
              className="rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm"
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button onClick={handleCreateInvite} disabled={role === 'barbeiro' && !barberId}>
          Gerar convite
        </Button>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Convites pendentes</h2>
        <Card className="divide-y divide-zinc-100">
          {invites.filter((i) => !i.used).length === 0 && (
            <p className="p-4 text-sm text-graphite">Nenhum convite pendente.</p>
          )}
          {invites
            .filter((i) => !i.used)
            .map((i) => (
              <div key={i.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-ink capitalize">{i.role}</p>
                  <p className="text-xs text-graphite">
                    Expira em {new Date(i.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleCopy(i)}>
                    <Copy size={14} /> {copiedId === i.id ? 'Copiado!' : 'Copiar link'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRevoke(i.id)}>
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            ))}
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Equipe ativa</h2>
        <Card className="divide-y divide-zinc-100">
          {staff.length === 0 && <p className="p-4 text-sm text-graphite">Nenhum membro além de você ainda.</p>}
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-ink">{s.full_name ?? '—'}</p>
                <p className="text-xs capitalize text-graphite">{s.role}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemoveStaff(s.id)}>
                <Trash2 size={15} />
              </Button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
