import { useEffect, useState } from 'react';
import { DEFAULT_BARBERSHOP_SLUG } from '@/lib/supabase';
import { applyBarbershopTheme } from '@/lib/theme';
import { getBarbershopBySlug } from '@/services/barbershop';
import { Barbershop } from '@/types';

interface State {
  barbershop: Barbershop | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hoje resolve a barbearia pelo slug padrão (env var).
 * Preparado para, no futuro, resolver pelo subdomínio/hostname
 * quando o sistema virar multi-domínio (ver seção 17 do briefing).
 */
export function useBarbershop(): State {
  const [state, setState] = useState<State>({ barbershop: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    getBarbershopBySlug(DEFAULT_BARBERSHOP_SLUG)
      .then((shop) => {
        if (!active) return;
        applyBarbershopTheme(shop);
        setState({ barbershop: shop, loading: false, error: null });
      })
      .catch((err) => {
        if (!active) return;
        setState({
          barbershop: null,
          loading: false,
          error: err.message ?? 'Não foi possível carregar a barbearia.',
        });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
