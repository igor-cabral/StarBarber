import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function LegalPageLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <Link to="/" className="text-sm text-graphite hover:text-ink">
        ← Voltar ao início
      </Link>
      <h1 className="mb-1 mt-4 font-display text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mb-8 text-sm text-graphite">Última atualização: {updatedAt}</p>

      <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Este documento é uma base técnica de conformidade e não substitui assessoria jurídica. Recomendamos revisão
        por um advogado antes de considerá-lo definitivo para a sua operação.
      </div>

      <div className="flex flex-col gap-5 text-sm leading-relaxed text-graphite [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_strong]:text-ink [&_a]:text-ink [&_a]:underline">
        {children}
      </div>
    </div>
  );
}
