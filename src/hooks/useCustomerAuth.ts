import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CustomerUser, getCurrentCustomerUser } from '@/services/customerAuth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface State {
  user: CustomerUser | null;
  loading: boolean;
  status: AuthStatus;
}

export function useCustomerAuth(): State {
  const [state, setState] = useState<State>({ user: null, loading: true, status: 'loading' });

  useEffect(() => {
    let active = true;

    async function load() {
      const user = await getCurrentCustomerUser();
      if (!active) return;
      setState({ user, loading: false, status: user ? 'authenticated' : 'unauthenticated' });
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
