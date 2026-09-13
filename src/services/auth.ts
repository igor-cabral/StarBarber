import { supabase } from '@/lib/supabase';
import { StaffRole } from '@/types';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string, redirectPath = '/admin/reset-password') {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${redirectPath}`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export interface AdminProfile {
  id: string;
  barbershop_id: string | null;
  role: StaffRole;
  full_name: string | null;
  barber_id: string | null;
  /** null para o master (não pertence a uma barbearia específica) */
  barbershop_active: boolean | null;
  barbershop_name: string | null;
}

/**
 * Perfil de quem opera DENTRO de uma barbearia (admin/caixa/barbeiro).
 * Ao contrário de AdminProfile, aqui barbershop_id é garantidamente
 * uma string — a checagem acontece uma única vez, no AdminLayout,
 * antes de qualquer página filha renderizar. Isso elimina a necessidade
 * de usar `!` (asserção do TypeScript, que não protege em runtime) nas
 * páginas administrativas.
 */
export interface ShopStaffProfile extends AdminProfile {
  barbershop_id: string;
}

export function isShopStaffProfile(profile: AdminProfile): profile is ShopStaffProfile {
  return profile.role !== 'master' && typeof profile.barbershop_id === 'string' && profile.barbershop_id.length > 0;
}

export async function getCurrentProfile(): Promise<AdminProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*, barbershops(active, name)')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;

  const shop = (data as any).barbershops as { active: boolean; name: string } | null;

  return {
    id: data.id,
    barbershop_id: data.barbershop_id,
    role: data.role,
    full_name: data.full_name,
    barber_id: data.barber_id,
    barbershop_active: shop?.active ?? null,
    barbershop_name: shop?.name ?? null,
  };
}
