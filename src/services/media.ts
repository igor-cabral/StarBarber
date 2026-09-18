import { supabase } from '@/lib/supabase';

export async function uploadBarbershopMedia(
  barbershopId: string,
  category: 'products' | 'services' | 'barbers',
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${barbershopId}/${category}/${crypto.randomUUID()}.${safeExt}`;
  const { error } = await supabase.storage.from('barbershop-media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return supabase.storage.from('barbershop-media').getPublicUrl(path).data.publicUrl;
}
