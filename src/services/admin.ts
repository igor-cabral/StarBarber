import { supabase } from '@/lib/supabase';
import { Barber, BlockedTime, Customer, Service, WorkingHour } from '@/types';

// ---------------------------------------------------------
// Services CRUD
// ---------------------------------------------------------
export async function listAllServices(barbershopId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Service[];
}

export async function upsertService(service: Partial<Service> & { barbershop_id: string }) {
  const { data, error } = await supabase.from('services').upsert(service).select().single();
  if (error) throw error;
  return data as Service;
}

export async function deleteService(id: string) {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------
// Barbers CRUD
// ---------------------------------------------------------
export async function listAllBarbers(barbershopId: string): Promise<Barber[]> {
  const { data, error } = await supabase
    .from('barbers')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Barber[];
}

export async function upsertBarber(barber: Partial<Barber> & { barbershop_id: string }) {
  const { data, error } = await supabase.from('barbers').upsert(barber).select().single();
  if (error) throw error;
  return data as Barber;
}

export async function deleteBarber(id: string) {
  const { error } = await supabase.from('barbers').delete().eq('id', id);
  if (error) throw error;
}

export async function setBarberServices(barberId: string, serviceIds: string[]) {
  await supabase.from('barber_services').delete().eq('barber_id', barberId);
  if (serviceIds.length === 0) return;
  const { error } = await supabase
    .from('barber_services')
    .insert(serviceIds.map((service_id) => ({ barber_id: barberId, service_id })));
  if (error) throw error;
}

// ---------------------------------------------------------
// Working hours
// ---------------------------------------------------------
export async function listWorkingHours(barberId: string): Promise<WorkingHour[]> {
  const { data, error } = await supabase
    .from('working_hours')
    .select('*')
    .eq('barber_id', barberId)
    .order('weekday', { ascending: true });
  if (error) throw error;
  return data as WorkingHour[];
}

export async function replaceWorkingHours(barberId: string, hours: Omit<WorkingHour, 'id' | 'barber_id'>[]) {
  await supabase.from('working_hours').delete().eq('barber_id', barberId);
  if (hours.length === 0) return;
  const { error } = await supabase
    .from('working_hours')
    .insert(hours.map((h) => ({ ...h, barber_id: barberId })));
  if (error) throw error;
}

// ---------------------------------------------------------
// Blocked times (folgas, férias, bloqueios, feriados)
// ---------------------------------------------------------
export async function listBlockedTimes(barbershopId: string): Promise<BlockedTime[]> {
  const { data, error } = await supabase
    .from('blocked_times')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return data as BlockedTime[];
}

export async function createBlockedTime(bt: Omit<BlockedTime, 'id'>) {
  const { error } = await supabase.from('blocked_times').insert(bt);
  if (error) throw error;
}

export async function deleteBlockedTime(id: string) {
  const { error } = await supabase.from('blocked_times').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------
// Customers
// ---------------------------------------------------------
export async function listCustomers(barbershopId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Customer[];
}
