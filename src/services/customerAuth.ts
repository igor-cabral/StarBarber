import { supabase } from '@/lib/supabase';

export async function customerSignUp(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: { full_name: params.fullName, phone: params.phone },
    },
  });
  if (error) throw error;
  return data;
}

export async function customerSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function customerSignOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestCustomerPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/conta/nova-senha`,
  });
  if (error) throw error;
}

export interface CustomerUser {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
}

export async function getCurrentCustomerUser(): Promise<CustomerUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    fullName: (user.user_metadata?.full_name as string) ?? null,
    phone: (user.user_metadata?.phone as string) ?? null,
  };
}
