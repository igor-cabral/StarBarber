import { supabase } from '@/lib/supabase';
import { Appointment } from '@/types';

export async function listMyAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, barber:barbers(*), service:services(*), customer:customers(*)')
    .order('starts_at', { ascending: false });

  if (error) throw error;
  return data as Appointment[];
}

export async function cancelMyAppointment(appointmentId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_own_appointment', { p_appointment_id: appointmentId });
  if (error) throw error;
}

export async function rescheduleMyAppointment(appointmentId: string, newStartsAt: string): Promise<void> {
  const { error } = await supabase.rpc('reschedule_own_appointment', {
    p_appointment_id: appointmentId,
    p_new_starts_at: newStartsAt,
  });
  if (error) throw error;
}
