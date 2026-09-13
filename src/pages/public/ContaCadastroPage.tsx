import { FormEvent, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { customerSignUp } from '@/services/customerAuth';

export function ContaCadastroPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const redirectTo = (location.state as any)?.from ?? '/conta';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { session } = await customerSignUp({ email, password, fullName, phone });
      if (session) {
        navigate(redirectTo);
      } else {
        setAwaitingConfirmation(true);
      }
    } catch (err: any) {
      setError(
        err.message?.includes('already registered')
          ? 'Já existe uma conta com este e-mail. Tente entrar.'
          : 'Não foi possível criar sua conta. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-5 py-10">
        <Card className="p-8 text-center">
          <h1 className="mb-2 font-display text-xl font-semibold">Confirme seu e-mail</h1>
          <p className="text-sm text-graphite">
            Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar, volte e faça login.
          </p>
          <Link to="/conta/entrar" className="mt-4 inline-block text-sm text-graphite underline">
            Ir para o login
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-5 py-10">
      <Card className="p-8">
        <h1 className="mb-1 font-display text-xl font-semibold">Criar conta</h1>
        <p className="mb-6 text-sm text-graphite">Leva menos de um minuto — depois é só agendar.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField label="Nome completo" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <TextField
            label="WhatsApp"
            type="tel"
            placeholder="(47) 99999-0000"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <TextField label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            label="Senha"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Criando conta…' : 'Criar conta'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-graphite">
          Já tem conta?{' '}
          <Link to="/conta/entrar" state={{ from: redirectTo }} className="font-medium text-ink underline">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  );
}
