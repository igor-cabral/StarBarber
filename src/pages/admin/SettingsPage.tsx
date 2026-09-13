import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShopStaffProfile } from '@/services/auth';
import { supabase } from '@/lib/supabase';
import { Barbershop } from '@/types';
import { getBarbershopBySlug } from '@/services/barbershop';
import { applyBarbershopTheme } from '@/lib/theme';
import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { friendlyError } from '@/utils/errors';

export function SettingsPage() {
  const { profile } = useOutletContext<{ profile: ShopStaffProfile }>();
  const [shop, setShop] = useState<Barbershop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from('barbershops')
      .select('*')
      .eq('id', profile.barbershop_id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(friendlyError(error, 'Não foi possível carregar as configurações. Tente novamente.'));
        else setShop(data as Barbershop);
      });
  }, [profile.barbershop_id]);

  async function handleSave() {
    const current = shop;
    if (!current) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from('barbershops')
      .update({
        name: current.name,
        tagline: current.tagline,
        description: current.description,
        phone: current.phone,
        whatsapp: current.whatsapp,
        instagram: current.instagram,
        address: current.address,
        color_ink: current.color_ink,
        color_graphite: current.color_graphite,
        color_paper: current.color_paper,
        color_accent: current.color_accent,
        min_minutes_between_appointments: current.min_minutes_between_appointments,
        cancellation_policy: current.cancellation_policy,
      })
      .eq('id', current.id);
    setSaving(false);
    if (error) setError(friendlyError(error, 'Não foi possível salvar as alterações. Tente novamente.'));
    else {
      applyBarbershopTheme(current);
      setSaved(true);
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!shop) return <LoadingState />;

  const currentShop = shop;

  function field<K extends keyof Barbershop>(key: K) {
    return {
      value: (currentShop[key] as string) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setShop({ ...currentShop, [key]: e.target.value }),
    };
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-graphite">Dados públicos e preferências da barbearia.</p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-medium text-ink">Identidade</h2>
        <TextField label="Nome" {...field('name')} />
        <TextField label="Frase de impacto" {...field('tagline')} />
        <TextField label="Descrição" {...field('description')} />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-medium text-ink">Contato</h2>
        <TextField label="Telefone" {...field('phone')} />
        <TextField label="WhatsApp (com DDI, ex: 5547999990000)" {...field('whatsapp')} />
        <TextField label="Instagram" {...field('instagram')} />
        <TextField label="Endereço" {...field('address')} />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-medium text-ink">Paleta de cores</h2>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Cor principal (ink)" type="color" {...field('color_ink')} />
          <TextField label="Cor secundária (graphite)" type="color" {...field('color_graphite')} />
          <TextField label="Fundo (paper)" type="color" {...field('color_paper')} />
          <TextField label="Cor de destaque (accent)" type="color" {...field('color_accent')} />
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-medium text-ink">Regras de agendamento</h2>
        <TextField
          label="Intervalo mínimo entre agendamentos (minutos)"
          type="number"
          value={shop.min_minutes_between_appointments.toString()}
          onChange={(e) => setShop({ ...shop, min_minutes_between_appointments: Number(e.target.value) })}
        />
        <TextField label="Política de cancelamento" {...field('cancellation_policy')} />
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </Button>
        {saved && <span className="text-sm text-emerald-600">Salvo com sucesso.</span>}
      </div>
    </div>
  );
}
