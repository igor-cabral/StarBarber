import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DEFAULT_BARBERSHOP_SLUG } from '@/lib/supabase';
import { applyBarbershopTheme } from '@/lib/theme';
import { getBarbershopBySlug } from '@/services/barbershop';
import { Barbershop } from '@/types';

interface State {
  barbershop: Barbershop | null;
  loading: boolean;
  error: string | null;
  /** true quando o slug veio explicitamente da URL (/b/:slug) — usado para não confundir "não encontrado" com o fallback de dev. */
  notFound: boolean;
}

/**
 * Resolve a barbearia pelo slug da URL atual (rota /b/:slug/*).
 *
 * Fora de /b/:slug (compatibilidade de desenvolvimento, ex. "/"),
 * usa DEFAULT_BARBERSHOP_SLUG — mas isso só vale quando NÃO existe
 * slug na URL. Se o slug veio da URL e não corresponde a nenhuma
 * barbearia, isso é tratado como 404 de verdade, nunca como fallback
 * silencioso para a barbearia padrão.
 */
export function useBarbershop(): State {
  const { slug: slugFromUrl } = useParams<{ slug?: string }>();
  const slug = slugFromUrl || DEFAULT_BARBERSHOP_SLUG;
  const [state, setState] = useState<State>({ barbershop: null, loading: true, error: null, notFound: false });

  useEffect(() => {
    let active = true;
    setState({ barbershop: null, loading: true, error: null, notFound: false });

    getBarbershopBySlug(slug)
      .then((shop) => {
        if (!active) return;
        applyBarbershopTheme(shop);
        setState({ barbershop: shop, loading: false, error: null, notFound: false });
      })
      .catch(() => {
        if (!active) return;
        setState({
          barbershop: null,
          loading: false,
          error: 'Barbearia não encontrada.',
          notFound: true,
        });
      });
    return () => {
      active = false;
    };
  }, [slug]);

  return state;
}
