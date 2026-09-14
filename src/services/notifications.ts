import { supabase } from '@/lib/supabase';
import { AppNotification } from '@/types';

export async function listNotifications(barbershopId: string, limit = 20): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as AppNotification[];
}

export async function countUnreadNotifications(barbershopId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('barbershop_id', barbershopId)
    .eq('read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllNotificationsRead(barbershopId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('barbershop_id', barbershopId)
    .eq('read', false);
  if (error) throw error;
}
