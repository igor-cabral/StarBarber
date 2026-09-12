import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminProfile, getCurrentProfile } from '@/services/auth';

interface State {
  profile: AdminProfile | null;
  loading: boolean;
}

export function useAuth(): State {
  const [state, setState] = useState<State>({ profile: null, loading: true });

  useEffect(() => {
    let active = true;

    async function load() {
      const profile = await getCurrentProfile();
      if (active) setState({ profile, loading: false });
    }
    load();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
