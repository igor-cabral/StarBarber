import { supabase } from '@/lib/supabase';
import { Slot } from '@/types';

/**
 * Busca os horários disponíveis de um profissional para um serviço em uma data.
 * A regra de negócio (expediente, almoço, bloqueios, conflitos) vive inteira
 * no banco (função get_available_slots) para garantir consistência mesmo
 * com múltiplos clientes acessando ao mesmo tempo.
 */
export async function getAvailableSlots(
  barberId: string,
  serviceId: string,
  date: string // yyyy-mm-dd
): Promise<Slot[]> {
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_barber_id: barberId,
    p_service_id: serviceId,
    p_date: date,
  });

  if (error) throw error;
  return (data ?? []) as Slot[];
}

/**
 * Para o modo "qualquer profissional": busca os slots de todos os
 * profissionais aptos e retorna a união (deduplicada por horário),
 * junto com qual profissional atende em cada slot.
 */
export async function getAvailableSlotsForAnyBarber(
  barberIds: string[],
  serviceId: string,
  date: string
): Promise<{ slot: Slot; barberId: string }[]> {
  const results = await Promise.all(
    barberIds.map(async (barberId) => {
      const slots = await getAvailableSlots(barberId, serviceId, date);
      return slots.map((slot) => ({ slot, barberId }));
    })
  );

  const flat = results.flat();
  const seen = new Set<string>();
  const deduped: { slot: Slot; barberId: string }[] = [];

  for (const item of flat.sort((a, b) => a.slot.slot_start.localeCompare(b.slot.slot_start))) {
    if (!seen.has(item.slot.slot_start)) {
      seen.add(item.slot.slot_start);
      deduped.push(item);
    }
  }

  return deduped;
}
