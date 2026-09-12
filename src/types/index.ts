export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Barbershop {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  address: string | null;
  color_ink: string;
  color_graphite: string;
  color_paper: string;
  color_accent: string;
  min_minutes_between_appointments: number;
  cancellation_policy: string | null;
}

export interface Service {
  id: string;
  barbershop_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  photo_url: string | null;
  active: boolean;
}

export interface Barber {
  id: string;
  barbershop_id: string;
  name: string;
  photo_url: string | null;
  description: string | null;
  specialties: string[];
  active: boolean;
}

export interface WorkingHour {
  id: string;
  barber_id: string;
  weekday: number; // 0 = domingo
  start_time: string;
  end_time: string;
  break_start_time: string | null;
  break_end_time: string | null;
}

export interface BlockedTime {
  id: string;
  barbershop_id: string;
  barber_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

export interface Customer {
  id: string;
  barbershop_id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  barbershop_id: string;
  barber_id: string;
  service_id: string;
  customer_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  code: string;
  price_cents: number;
  notes: string | null;
  created_at: string;
  // campos expandidos via join, quando disponíveis
  barber?: Barber;
  service?: Service;
  customer?: Customer;
}

export interface Slot {
  slot_start: string;
  slot_end: string;
}

export interface BookingSelection {
  service: Service | null;
  barber: Barber | 'any' | null;
  date: string | null; // yyyy-mm-dd
  slot: Slot | null;
  /** Quando barber === 'any', guarda qual profissional foi de fato escolhido ao selecionar o slot. */
  resolvedBarberId: string | null;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string;
}
