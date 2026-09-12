import { supabase } from '@/lib/supabase';
import { Appointment, AppointmentStatus } from '@/types';

export interface CreateAppointmentInput {
  barbershopId: string;
  barberId: string;
  serviceId: string;
  startsAt: string; // ISO
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string;
}

export interface CreateAppointmentResult {
  appointmentId: string;
  code: string;
}

/**
 * Cria o agendamento via função SQL (create_public_appointment), que:
 * - faz upsert do cliente;
 * - gera o código único;
 * - insere o agendamento;
 * - é protegida contra corrida pela constraint EXCLUDE no banco.
 * Se o horário foi tomado entre a consulta e o clique, o Supabase
 * retorna um erro claro que é repassado para a UI.
 */
export async function createPublicAppointment(
  input: CreateAppointmentInput
): Promise<CreateAppointmentResult> {
  const { data, error } = await supabase.rpc('create_public_appointment', {
    p_barbershop_id: input.barbershopId,
    p_barber_id: input.barberId,
    p_service_id: input.serviceId,
    p_starts_at: input.startsAt,
    p_customer_name: input.customerName,
    p_customer_whatsapp: input.customerWhatsapp,
    p_customer_email: input.customerEmail,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { appointmentId: row.appointment_id, code: row.appointment_code };
}

export async function getAppointmentByCode(code: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, barber:barbers(*), service:services(*), customer:customers(*)')
    .eq('code', code)
    .maybeSingle();

  if (error) throw error;
  return data as Appointment | null;
}

// ---------------------------------------------------------
// Área administrativa
// ---------------------------------------------------------

export async function listAppointments(params: {
  barbershopId: string;
  from?: string;
  to?: string;
  status?: AppointmentStatus;
}): Promise<Appointment[]> {
  let query = supabase
    .from('appointments')
    .select('*, barber:barbers(*), service:services(*), customer:customers(*)')
    .eq('barbershop_id', params.barbershopId)
    .order('starts_at', { ascending: true });

  if (params.from) query = query.gte('starts_at', params.from);
  if (params.to) query = query.lte('starts_at', params.to);
  if (params.status) query = query.eq('status', params.status);

  const { data, error } = await query;
  if (error) throw error;
  return data as Appointment[];
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
): Promise<void> {
  const { error } = await supabase.from('appointments').update({ status }).eq('id', appointmentId);
  if (error) throw error;
}

export async function rescheduleAppointment(
  appointmentId: string,
  startsAt: string,
  endsAt: string
): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ starts_at: startsAt, ends_at: endsAt })
    .eq('id', appointmentId);
  if (error) throw error;
}
