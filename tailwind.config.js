/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ligadas a CSS variables setadas em runtime a partir das
        // configurações da barbearia (ver src/lib/theme.ts).
        ink: 'var(--color-ink)',
        graphite: 'var(--color-graphite)',
        paper: 'var(--color-paper)',
        accent: 'var(--color-accent)',
        'accent-soft': 'var(--color-accent-soft)',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,17,17,0.06), 0 8px 24px -8px rgba(17,17,17,0.12)',
      },
      keyframes: {
        'rise-in': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'rise-in': 'rise-in 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
