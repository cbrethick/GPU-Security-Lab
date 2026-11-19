/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: { 950: '#05070d', 900: '#0a0e17', 850: '#0e1320', 800: '#131a2a', 700: '#1c2538' },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          2: 'rgb(var(--accent-2) / <alpha-value>)',
        },
      },
      keyframes: {
        borderflow: { '0%': { backgroundPosition: '0% 50%' }, '100%': { backgroundPosition: '200% 50%' } },
        pulseglow: { '0%,100%': { opacity: '0.45' }, '50%': { opacity: '1' } },
      },
      animation: {
        borderflow: 'borderflow 6s linear infinite',
        pulseglow: 'pulseglow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
