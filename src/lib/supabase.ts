import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas. ' +
      'Copie .env.example para .env e preencha com os dados do seu projeto Supabase.'
  );
}

// Nunca importe/utilize a service_role key aqui — só a anon key,
// que é segura para o frontend porque toda a proteção real vem do RLS.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const DEFAULT_BARBERSHOP_SLUG =
  (import.meta.env.VITE_DEFAULT_BARBERSHOP_SLUG as string) || 'barbearia-prime';
