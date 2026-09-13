import { Barbershop } from '@/types';

/**
 * Aplica as cores configuradas da barbearia como CSS variables,
 * permitindo paleta por tenant sem rebuild do Tailwind.
 */
export function applyBarbershopTheme(shop: Pick<Barbershop, 'color_ink' | 'color_graphite' | 'color_paper' | 'color_accent'>) {
  const root = document.documentElement;
  root.style.setProperty('--color-ink', shop.color_ink);
  root.style.setProperty('--color-graphite', shop.color_graphite);
  root.style.setProperty('--color-paper', shop.color_paper);
  root.style.setProperty('--color-accent', shop.color_accent);
  root.style.setProperty('--color-accent-soft', hexToSoft(shop.color_accent));
}

function hexToSoft(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
}
