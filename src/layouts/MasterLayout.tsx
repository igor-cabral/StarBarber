import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/services/auth';
import { LoadingState } from '@/components/ui/States';
import { LogOut, ShieldCheck } from 'lucide-react';

export function MasterLayout() {
  const { profile, status } = useAuth();
  const navigate = useNavigate();

  if (status === 'loading') return <LoadingState label="Carregando…" />;
  if (!profile) return <Navigate to="/master/login" replace />;
  if (profile.role !== 'master') return <Navigate to="/admin" replace />;

  async function handleSignOut() {
    await signOut();
    navigate('/master/login');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-accent" />
          <span className="font-display font-semibold">Master</span>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <LogOut size={16} /> Sair
        </button>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
