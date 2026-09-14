import { supabase } from '@/lib/supabase';
import { Barbershop, Service, Barber } from '@/types';

export async function getBarbershopBySlug(slug: string): Promise<Barbershop> {
  const { data, error } = await supabase
    .from('barbershops')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as Barbershop;
}

export async function getActiveServices(barbershopId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .eq('active', true)
    .order('price_cents', { ascending: true });

  if (error) throw error;
  return data as Service[];
}

export async function getActiveBarbers(barbershopId: string): Promise<Barber[]> {
  const { data, error } = await supabase
    .from('barbers')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .eq('active', true);

  if (error) throw error;
  return data as Barber[];
}

/** Retorna apenas os profissionais aptos a realizar um serviço específico. */
export async function getBarbersForService(barbershopId: string, serviceId: string): Promise<Barber[]> {
  const { data, error } = await supabase
    .from('barber_services')
    .select('barbers(*)')
    .eq('service_id', serviceId);

  if (error) throw error;
  return (data ?? [])
    .map((row: any) => row.barbers as Barber)
    .filter((b) => b && b.active && b.barbershop_id === barbershopId);
}
