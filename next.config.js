/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'selective-trading.vercel.app'],
    unoptimized: process.env.NODE_ENV === 'production',
  },
  experimental: {
    serverComponentsExternalPackages: ['nodemailer'],
  },
  // تكوين Vercel
  output: 'standalone',
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/contexts': path.resolve(__dirname, './contexts'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/components': path.resolve(__dirname, './components'),
      '@/models': path.resolve(__dirname, './models'),
      '@/public': path.resolve(__dirname, './public'),
      '@/data': path.resolve(__dirname, './data'),
      '@': path.resolve(__dirname, './'),
    };
    return config;
  },
}

module.exports = nextConfig