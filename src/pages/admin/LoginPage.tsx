import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { signIn, requestPasswordReset } from '@/services/auth';
import { redeemInvite } from '@/services/invites';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);

      // se o usuário veio de um convite que exigiu confirmação de
      // e-mail, resgata o convite agora que já tem sessão ativa.
      const pending = localStorage.getItem('pending_invite');
      if (pending) {
        try {
          const { token, fullName } = JSON.parse(pending);
          await redeemInvite(token, fullName);
        } catch {
          /* convite pode já ter sido usado ou expirado — segue o login normalmente */
        } finally {
          localStorage.removeItem('pending_invite');
        }
      }

      navigate('/admin');
    } catch (err: any) {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email) {
      setError('Digite seu e-mail acima para receber o link de recuperação.');
      return;
    }
    try {
      await requestPasswordReset(email);
      setResetSent(true);
    } catch {
      setError('Não foi possível enviar o e-mail de recuperação.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-5">
      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-1 font-display text-xl font-semibold">Painel administrativo</h1>
        <p className="mb-6 text-sm text-graphite">Entre com sua conta da barbearia.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            label="Senha"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {resetSent && <p className="text-sm text-emerald-600">Link de recuperação enviado para seu e-mail.</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
          <button type="button" onClick={handleReset} className="text-sm text-graphite hover:text-ink">
            Esqueci minha senha
          </button>
        </form>
      </Card>
    </div>
  );
}
