import { supabase } from '@/lib/supabase';

export interface CreateCustomerAppointmentInput {
  barbershopId: string;
  barberId: string;
  serviceId: string;
  startsAt: string;
  customerName: string;
  customerWhatsapp: string;
}

export async function createCustomerAppointment(
  input: CreateCustomerAppointmentInput
): Promise<{ appointmentId: string; code: string }> {
  const { data, error } = await supabase.rpc('create_customer_appointment', {
    p_barbershop_id: input.barbershopId,
    p_barber_id: input.barberId,
    p_service_id: input.serviceId,
    p_starts_at: input.startsAt,
    p_customer_name: input.customerName,
    p_customer_whatsapp: input.customerWhatsapp,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { appointmentId: row.appointment_id, code: row.appointment_code };
}
