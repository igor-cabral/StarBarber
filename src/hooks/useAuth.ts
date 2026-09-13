import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminProfile, getCurrentProfile } from '@/services/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface State {
  profile: AdminProfile | null;
  loading: boolean;
  /** Estado explícito — evita tratar "ainda carregando" como "não logado". */
  status: AuthStatus;
}

export function useAuth(): State {
  const [state, setState] = useState<State>({ profile: null, loading: true, status: 'loading' });

  useEffect(() => {
    let active = true;

    async function load() {
      const profile = await getCurrentProfile();
      if (!active) return;
      setState({ profile, loading: false, status: profile ? 'authenticated' : 'unauthenticated' });
    }
    load();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setState((s) => ({ ...s, loading: true, status: 'loading' }));
      load();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
