/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui'],
        body: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular']
      },
      colors: {
        panel: '#0f172a',
        ink: '#dbeafe',
        accent: '#06b6d4',
        warm: '#f59e0b'
      },
      boxShadow: {
        panel: '0 24px 60px rgba(2, 6, 23, 0.45)'
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        rise: 'rise 320ms ease-out'
      }
    }
  },
  plugins: []
};
