import { FormEvent, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { customerSignIn, requestCustomerPasswordReset } from '@/services/customerAuth';

export function ContaLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const redirectTo = (location.state as any)?.from ?? '/conta';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await customerSignIn(email, password);
      navigate(redirectTo);
    } catch {
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
      await requestCustomerPasswordReset(email);
      setResetSent(true);
    } catch {
      setError('Não foi possível enviar o e-mail de recuperação.');
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-5 py-10">
      <Card className="p-8">
        <h1 className="mb-1 font-display text-xl font-semibold">Entrar</h1>
        <p className="mb-6 text-sm text-graphite">Acesse sua conta para ver ou gerenciar seus agendamentos.</p>

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

        <p className="mt-6 text-center text-sm text-graphite">
          Ainda não tem conta?{' '}
          <Link to="/conta/cadastro" state={{ from: redirectTo }} className="font-medium text-ink underline">
            Criar conta
          </Link>
        </p>
      </Card>
    </div>
  );
}
