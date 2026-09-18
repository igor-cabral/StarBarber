import { supabase } from '@/lib/supabase';
import { Appointment } from '@/types';
import { listMyProductReservations, listMySales } from '@/services/commerce';

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

/** Portabilidade (LGPD art. 18, V): exporta os dados do cliente em JSON. */
export async function exportMyData(): Promise<Record<string, unknown>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [appointments, reservations, purchases] = await Promise.all([listMyAppointments(), listMyProductReservations(), listMySales()]);

  return {
    conta: {
      email: user?.email ?? null,
      nome: user?.user_metadata?.full_name ?? null,
      whatsapp: user?.user_metadata?.phone ?? null,
      criado_em: user?.created_at ?? null,
    },
    agendamentos: appointments.map((a) => ({
      codigo: a.code,
      servico: a.service?.name,
      profissional: a.barber?.name,
      inicio: a.starts_at,
      status: a.status,
      valor_centavos: a.price_cents,
    })),
    reservas_de_produtos: reservations.map((r) => ({
      codigo: r.code,
      status: r.status,
      criado_em: r.created_at,
      expira_em: r.expires_at,
      itens: r.items?.map((i) => ({ produto: i.product?.name, quantidade: i.quantity, valor_unitario_centavos: i.unit_price_cents })),
    })),
    compras: purchases.map((s) => ({
      criado_em: s.created_at,
      forma_pagamento: s.payment_method,
      total_centavos: s.total_cents,
      itens: s.items?.map((i) => ({ descricao: i.description, quantidade: i.quantity, total_centavos: i.total_cents })),
    })),
    exportado_em: new Date().toISOString(),
  };
}

/** Direito de exclusão (LGPD art. 18, VI): anonimiza os dados pessoais do cliente. */
export async function requestMyDataDeletion(): Promise<void> {
  const { error } = await supabase.rpc('request_customer_data_deletion');
  if (error) throw error;
}
