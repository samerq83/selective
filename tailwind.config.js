/** @type {import('tailwindcss').Config} */
module.exports = {
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
        'dark-gray': '#1F1F1F',
        'light-gray': '#F5F5F5',
      },
    },
  },
  plugins: [],
}