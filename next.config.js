/** @type {import('next').NextConfig} */
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
}

module.exports = nextConfig