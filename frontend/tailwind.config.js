/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        head: ['Orbitron', 'sans-serif'],
        sub: ['Rajdhani', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      colors: {
        'bg-void': '#06080c',
        'panel-bg': 'rgba(15, 20, 28, 0.85)',
        'panel-solid': '#0f141c',
        'panel-raised': 'rgba(24, 32, 45, 0.9)',
        'neon-cyan': '#00f3ff',
        'neon-amber': '#ffb703',
        'neon-red': '#ff0055',
        'neon-green': '#00ff9d',
        'neon-purple': '#9d4edd',
      },
    },
  },
  plugins: [],
}

