import { FormEvent, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getInvitePreview, redeemInvite, InvitePreview } from '@/services/invites';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { friendlyError } from '@/utils/errors';
import { buildConsentMetadata } from '@/utils/legal';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador(a)',
  caixa: 'Operador(a) de caixa',
  barbeiro: 'Profissional',
};

export function InviteRedeemPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<InvitePreview | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (!token) return;
    getInvitePreview(token)
      .then((p) => {
        setPreview(p);
        if (p?.email) setEmail(p.email);
      })
      .catch((err) => setError(friendlyError(err, 'Convite inválido ou expirado.')));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!acceptedTerms) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: buildConsentMetadata() },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        await redeemInvite(token, fullName);
        navigate('/admin');
      } else {
        // projeto exige confirmação de e-mail: resgata o convite no primeiro login
        localStorage.setItem('pending_invite', JSON.stringify({ token, fullName }));
        setAwaitingConfirmation(true);
      }
    } catch (err: any) {
      setError(friendlyError(err, 'Não foi possível concluir o cadastro.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (preview === undefined) return <LoadingState label="Verificando convite…" />;
  if (error && preview === undefined) return <ErrorState message={error} />;
  if (!preview) return <ErrorState message="Convite inválido ou expirado." />;

  if (awaitingConfirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-5">
        <Card className="w-full max-w-sm p-8 text-center">
          <h1 className="mb-2 font-display text-lg font-semibold">Confirme seu e-mail</h1>
          <p className="text-sm text-graphite">
            Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar, volte e faça login
            normalmente — seu acesso será liberado automaticamente.
          </p>
          <Link to="/admin/login" className="mt-4 inline-block text-sm text-graphite underline">
            Ir para o login
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-5">
      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-1 font-display text-xl font-semibold">{preview.barbershop_name}</h1>
        <p className="mb-6 text-sm text-graphite">
          Você foi convidado(a) como <strong>{ROLE_LABELS[preview.role] ?? preview.role}</strong>. Crie sua senha
          para acessar o painel.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField label="Nome completo" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <TextField
            label="E-mail"
            type="email"
            required
            disabled={!!preview.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Senha"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <label className="flex items-start gap-2 text-sm text-graphite">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <span>
              Li e aceito os{' '}
              <Link to="/termos" target="_blank" className="font-medium text-ink underline">
                Termos de Uso
              </Link>{' '}
              e a{' '}
              <Link to="/privacidade" target="_blank" className="font-medium text-ink underline">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
          <Button type="submit" disabled={submitting || !acceptedTerms}>
            {submitting ? 'Criando conta…' : 'Criar conta e entrar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
