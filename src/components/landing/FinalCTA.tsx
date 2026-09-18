import { Link } from 'react-router-dom';

export function FinalCTA() {
  return (
    <section className="border-t border-zinc-100 py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-5 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Sua barbearia com agenda organizada e cliente atendido sem espera.
        </h2>
        <p className="max-w-md text-base text-graphite">
          Se sua barbearia já faz parte do StarBarber, acesse o painel administrativo abaixo.
        </p>
        <Link
          to="/admin/login"
          className="rounded-xl bg-ink px-7 py-3.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Acessar o painel
        </Link>
      </div>
    </section>
  );
}
