import { useEffect, useState } from 'react';
import {
  listAllBarbershops,
  createBarbershop,
  setBarbershopActive,
  listAllStaff,
  removeStaffAccess,
  StaffProfile,
} from '@/services/master';
import { createInvite, buildInviteLink } from '@/services/invites';
import { Barbershop } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Copy, Trash2, Power } from 'lucide-react';
import { friendlyError } from '@/utils/errors';

export function MasterDashboardPage() {
  const [shops, setShops] = useState<Barbershop[] | null>(null);
  const [staff, setStaff] = useState<StaffProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newShop, setNewShop] = useState({ slug: '', name: '', tagline: '' });
  const [lastInviteLink, setLastInviteLink] = useState<{ shopId: string; link: string } | null>(null);

  function reload() {
    listAllBarbershops().then(setShops).catch((err) => setError(friendlyError(err, 'Não foi possível carregar as barbearias. Tente novamente.')));
    listAllStaff().then(setStaff).catch((err) => setError(friendlyError(err, 'Não foi possível carregar os usuários. Tente novamente.')));
  }

  useEffect(reload, []);

  async function handleCreateShop() {
    if (!newShop.slug || !newShop.name) return;
    try {
      const shop = await createBarbershop(newShop);
      setNewShop({ slug: '', name: '', tagline: '' });
      reload();
      // gera automaticamente o convite de admin para a nova barbearia
      const invite = await createInvite({ barbershopId: shop.id, role: 'admin' });
      setLastInviteLink({ shopId: shop.id, link: buildInviteLink(invite.token) });
    } catch (err: any) {
      alert(friendlyError(err, 'Não foi possível criar a barbearia.'));
    }
  }

  async function handleToggleActive(shop: Barbershop) {
    await setBarbershopActive(shop.id, !shop.active);
    reload();
  }

  async function handleGenerateAdminInvite(shopId: string) {
    const invite = await createInvite({ barbershopId: shopId, role: 'admin' });
    setLastInviteLink({ shopId, link: buildInviteLink(invite.token) });
  }

  async function handleRemoveStaff(id: string) {
    if (!confirm('Remover o acesso deste usuário?')) return;
    await removeStaffAccess(id);
    reload();
  }

  if (error) return <ErrorState message={error} />;
  if (!shops || !staff) return <LoadingState />;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Barbearias</h1>
        <p className="text-sm text-zinc-400">Gerencie todos os clientes (tenants) do sistema.</p>
      </div>

      <Card className="flex flex-wrap items-end gap-3 bg-zinc-900 p-5 !border-zinc-800">
        <div className="[&_label]:text-zinc-400 [&_input]:bg-zinc-800 [&_input]:border-zinc-700 [&_input]:text-white">
          <TextField label="Slug (ex: barbearia-prime)" value={newShop.slug} onChange={(e) => setNewShop({ ...newShop, slug: e.target.value })} />
        </div>
        <div className="[&_label]:text-zinc-400 [&_input]:bg-zinc-800 [&_input]:border-zinc-700 [&_input]:text-white">
          <TextField label="Nome" value={newShop.name} onChange={(e) => setNewShop({ ...newShop, name: e.target.value })} />
        </div>
        <div className="[&_label]:text-zinc-400 [&_input]:bg-zinc-800 [&_input]:border-zinc-700 [&_input]:text-white">
          <TextField label="Tagline (opcional)" value={newShop.tagline} onChange={(e) => setNewShop({ ...newShop, tagline: e.target.value })} />
        </div>
        <Button onClick={handleCreateShop}>Criar barbearia</Button>
      </Card>

      {lastInviteLink && (
        <Card className="flex items-center justify-between gap-3 bg-emerald-950 p-4 !border-emerald-800">
          <p className="text-sm text-emerald-200">Convite de administrador gerado — envie este link ao dono da barbearia:</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigator.clipboard.writeText(lastInviteLink.link)}
          >
            <Copy size={14} /> Copiar link
          </Button>
        </Card>
      )}

      <Card className="divide-y divide-zinc-800 bg-zinc-900 !border-zinc-800">
        {shops.length === 0 && <p className="p-4 text-sm text-zinc-400">Nenhuma barbearia cadastrada.</p>}
        {shops.map((shop) => (
          <div key={shop.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-white">
                {shop.name}{' '}
                {!shop.active && <span className="ml-2 rounded bg-red-900 px-2 py-0.5 text-xs text-red-300">bloqueada</span>}
              </p>
              <p className="text-xs text-zinc-400">/{shop.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleGenerateAdminInvite(shop.id)}>
                Convidar admin
              </Button>
              <Button variant={shop.active ? 'danger' : 'primary'} size="sm" onClick={() => handleToggleActive(shop)}>
                <Power size={14} /> {shop.active ? 'Bloquear' : 'Desbloquear'}
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Usuários (todas as barbearias)</h2>
        <Card className="divide-y divide-zinc-800 bg-zinc-900 !border-zinc-800">
          {staff.length === 0 && <p className="p-4 text-sm text-zinc-400">Nenhum usuário cadastrado ainda.</p>}
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-white">{s.full_name ?? '—'}</p>
                <p className="text-xs capitalize text-zinc-400">
                  {s.role} · {s.barbershop?.name ?? '—'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemoveStaff(s.id)}>
                <Trash2 size={15} className="text-zinc-400" />
              </Button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
