import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { updatePassword } from '@/services/auth';
import { friendlyError } from '@/utils/errors';

export function ContaNovaSenhaPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate('/conta/entrar'), 2000);
    } catch (err) {
      setError(friendlyError(err, 'Não foi possível redefinir sua senha. Peça um novo link de recuperação.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-5 py-10">
      <Card className="p-8">
        <h1 className="mb-1 font-display text-xl font-semibold">Nova senha</h1>
        <p className="mb-6 text-sm text-graphite">Escolha uma nova senha para sua conta.</p>

        {done ? (
          <p className="text-sm text-emerald-600">Senha redefinida! Redirecionando para o login…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              label="Nova senha"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              label="Confirmar nova senha"
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando…' : 'Redefinir senha'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
