import { supabase } from '@/lib/supabase';
import { Barbershop } from '@/types';
import { AdminProfile } from '@/services/auth';

export async function listAllBarbershops(): Promise<Barbershop[]> {
  const { data, error } = await supabase.from('barbershops').select('*').order('name');
  if (error) throw error;
  return data as Barbershop[];
}

export async function createBarbershop(input: {
  slug: string;
  name: string;
  tagline?: string;
}): Promise<Barbershop> {
  const { data, error } = await supabase
    .from('barbershops')
    .insert({ slug: input.slug, name: input.name, tagline: input.tagline || null })
    .select()
    .single();
  if (error) throw error;
  return data as Barbershop;
}

export async function setBarbershopActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('barbershops').update({ active }).eq('id', id);
  if (error) throw error;
}

export async function deleteBarbershop(id: string): Promise<void> {
  const { error } = await supabase.from('barbershops').delete().eq('id', id);
  if (error) throw error;
}

export interface StaffProfile {
  id: string;
  barbershop_id: string;
  role: string;
  full_name: string | null;
  barber_id: string | null;
  barbershop?: { name: string };
}

export async function listAllStaff(): Promise<StaffProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, barbershop:barbershops(name)')
    .neq('role', 'master')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as StaffProfile[];
}

/** Remove o acesso de um usuário (apaga o perfil; a conta de login em si permanece órfã). */
export async function removeStaffAccess(profileId: string): Promise<void> {
  const { error } = await supabase.from('profiles').delete().eq('id', profileId);
  if (error) throw error;
}

export type { AdminProfile };
