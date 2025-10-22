import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary-red': '#DC2626',
        'primary-black': '#0F0F0F',
        'primary-white': '#FFFFFF',
        'accent-red': '#EF4444',
        'accent-darkGray': '#1F1F1F',
        'accent-lightGray': '#F5F5F5',
        primary: {
          red: '#DC2626',
          black: '#0F0F0F',
          white: '#FFFFFF',
        },
        accent: {
          red: '#EF4444',
          darkGray: '#1F1F1F',
          lightGray: '#F5F5F5',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slideDown': 'slideDown 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config