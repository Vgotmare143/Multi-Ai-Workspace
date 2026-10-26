/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ide: {
          bg: '#0f1117',
          panel: '#161922',
          sidebar: '#13161f',
          border: '#262b38',
          hover: '#1f2430',
          accent: '#3b82f6',
          text: '#e2e8f0',
          muted: '#94a3b8',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
