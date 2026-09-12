import { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive, className = '', ...props }: Props) {
  return (
    <div
      className={`rounded-card border border-zinc-100 bg-white shadow-card ${
        interactive ? 'cursor-pointer transition-transform duration-150 hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    />
  );
}
