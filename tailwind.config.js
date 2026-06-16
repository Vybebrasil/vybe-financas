/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './components/**/*.{ts,tsx}', './src/**/*.{ts,tsx}', './*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        vybe: {
          bg: '#121212',
          card: '#1E1E1E',
          accent: '#FF6600',
          text: '#FFFFFF',
          muted: '#B0B0B0',
          green: '#10B981',
          red: '#EF4444',
        },
      },
      animation: {
        'bar-grow': 'bar-grow 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        'bar-grow': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
};
