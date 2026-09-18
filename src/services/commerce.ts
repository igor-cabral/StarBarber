import { supabase } from '@/lib/supabase';
import {
  CashRegisterSession,
  Customer,
  PaymentMethod,
  Product,
  ProductReservation,
  Sale,
  Service,
} from '@/types';

export async function listProducts(barbershopId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function listPublicProducts(barbershopId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data as Product[];
}

export async function upsertProduct(product: Partial<Product> & { barbershop_id: string }) {
  const { data, error } = await supabase.from('products').upsert(product).select().single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') throw new Error('Este produto já possui movimentações. Desative-o em vez de excluir.');
    throw error;
  }
}

export async function createProductReservation(
  barbershopId: string,
  items: { product_id: string; quantity: number }[],
  notes?: string
): Promise<{ reservation_id: string; reservation_code: string }> {
  const { data, error } = await supabase.rpc('create_customer_product_reservation', {
    p_barbershop_id: barbershopId,
    p_items: items,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { reservation_id: string; reservation_code: string };
}

export async function listMyProductReservations(): Promise<ProductReservation[]> {
  const { data, error } = await supabase
    .from('product_reservations')
    .select('*, items:product_reservation_items(*, product:products(*))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ProductReservation[];
}

export async function cancelMyProductReservation(id: string) {
  const { error } = await supabase.rpc('cancel_own_product_reservation', { p_reservation_id: id });
  if (error) throw error;
}

export async function listShopReservations(barbershopId: string): Promise<ProductReservation[]> {
  const { data, error } = await supabase
    .from('product_reservations')
    .select('*, customer:customers(*), items:product_reservation_items(*, product:products(*))')
    .eq('barbershop_id', barbershopId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ProductReservation[];
}

export async function setReservationStatus(id: string, status: 'reserved' | 'ready' | 'cancelled' | 'expired') {
  const { error } = await supabase.rpc('set_product_reservation_status', {
    p_reservation_id: id,
    p_status: status,
  });
  if (error) throw error;
}

export async function getMyOpenCashSession(barbershopId: string): Promise<CashRegisterSession | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from('cash_register_sessions')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .eq('opened_by', auth.user.id)
    .is('closed_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as CashRegisterSession | null;
}

export async function openCashRegister(openingBalanceCents: number, notes?: string): Promise<CashRegisterSession> {
  const { data, error } = await supabase.rpc('open_cash_register', {
    p_opening_balance_cents: openingBalanceCents,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return data as CashRegisterSession;
}

export async function closeCashRegister(sessionId: string, closingBalanceCents: number, notes?: string) {
  const { error } = await supabase.rpc('close_cash_register', {
    p_session_id: sessionId,
    p_closing_balance_cents: closingBalanceCents,
    p_notes: notes ?? null,
  });
  if (error) throw error;
}

export async function createPosSale(input: {
  items: { item_type: 'product' | 'service'; id: string; quantity: number }[];
  paymentMethod: PaymentMethod;
  cashSessionId?: string | null;
  customerId?: string | null;
  appointmentId?: string | null;
  discountCents?: number;
  notes?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_pos_sale', {
    p_items: input.items,
    p_payment_method: input.paymentMethod,
    p_cash_session_id: input.cashSessionId ?? null,
    p_customer_id: input.customerId ?? null,
    p_appointment_id: input.appointmentId ?? null,
    p_discount_cents: input.discountCents ?? 0,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function fulfillProductReservation(
  reservationId: string,
  paymentMethod: PaymentMethod,
  cashSessionId?: string | null,
  discountCents = 0
): Promise<string> {
  const { data, error } = await supabase.rpc('fulfill_product_reservation', {
    p_reservation_id: reservationId,
    p_payment_method: paymentMethod,
    p_cash_session_id: cashSessionId ?? null,
    p_discount_cents: discountCents,
  });
  if (error) throw error;
  return data as string;
}


export async function listMySales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('*, items:sale_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Sale[];
}

export async function listRecentSales(barbershopId: string, limit = 50): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('*, customer:customers(*), items:sale_items(*)')
    .eq('barbershop_id', barbershopId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Sale[];
}

export async function listPosCatalog(barbershopId: string): Promise<{
  products: Product[];
  services: Service[];
  customers: Customer[];
}> {
  const [productsRes, servicesRes, customersRes] = await Promise.all([
    supabase.from('products').select('*').eq('barbershop_id', barbershopId).eq('active', true).order('name'),
    supabase.from('services').select('*').eq('barbershop_id', barbershopId).eq('active', true).order('name'),
    supabase.from('customers').select('*').eq('barbershop_id', barbershopId).order('name'),
  ]);
  if (productsRes.error) throw productsRes.error;
  if (servicesRes.error) throw servicesRes.error;
  if (customersRes.error) throw customersRes.error;
  return {
    products: productsRes.data as Product[],
    services: servicesRes.data as Service[],
    customers: customersRes.data as Customer[],
  };
}
