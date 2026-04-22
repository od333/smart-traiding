/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        arabic: ['system-ui', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
      colors: {
        background: {
          DEFAULT: '#050712',
          soft: '#090b1a',
          elevated: 'rgba(15,23,42,0.9)',
        },
        primary: {
          DEFAULT: '#38bdf8',
          soft: 'rgba(56,189,248,0.12)',
        },
        accent: {
          purple: '#a855f7',
          emerald: '#34d399',
        },
        glass: {
          DEFAULT: 'rgba(15,23,42,0.8)',
          soft: 'rgba(15,23,42,0.6)',
        },
        border: {
          subtle: 'rgba(148,163,184,0.35)',
        },
        positive: '#22c55e',
        negative: '#ef4444',
        neutral: '#e5e7eb',
      },
      boxShadow: {
        'soft-glow':
          '0 18px 45px rgba(15,23,42,0.9), 0 0 60px rgba(56,189,248,0.15)',
        'glass-dashed':
          '0 0 0 1px rgba(148,163,184,0.25), 0 18px 45px rgba(15,23,42,0.65)',
      },
      backdropBlur: {
        xs: '4px',
      },
      screens: {
        '3xl': '1680px',
      },
    },
  },
  plugins: [],
}

