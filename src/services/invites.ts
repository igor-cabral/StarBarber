import { supabase } from '@/lib/supabase';
import { Invite } from '@/types';

export async function createInvite(input: {
  barbershopId: string;
  role: 'admin' | 'caixa' | 'barbeiro';
  email?: string;
  barberId?: string;
}): Promise<Invite> {
  const { data, error } = await supabase
    .from('invites')
    .insert({
      barbershop_id: input.barbershopId,
      role: input.role,
      email: input.email || null,
      barber_id: input.barberId || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Invite;
}

export async function listInvites(barbershopId: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Invite[];
}

export async function revokeInvite(id: string): Promise<void> {
  const { error } = await supabase.from('invites').delete().eq('id', id);
  if (error) throw error;
}

export function buildInviteLink(token: string): string {
  return `${window.location.origin}/convite/${token}`;
}

export interface InvitePreview {
  barbershop_name: string;
  role: string;
  email: string | null;
}

export async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  const { data, error } = await supabase.rpc('get_invite_preview', { p_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

export async function redeemInvite(token: string, fullName: string): Promise<void> {
  const { error } = await supabase.rpc('redeem_invite', { p_token: token, p_full_name: fullName });
  if (error) throw error;
}
