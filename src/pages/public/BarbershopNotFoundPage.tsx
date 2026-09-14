import { Link } from 'react-router-dom';

export function BarbershopNotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-5 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Barbearia não encontrada</h1>
      <p className="max-w-sm text-sm text-graphite">
        O endereço que você acessou não corresponde a nenhuma barbearia cadastrada.
      </p>
      <Link to="/" className="mt-2 text-sm text-graphite underline">
        Voltar ao início
      </Link>
    </div>
  );
}
