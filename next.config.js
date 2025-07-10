/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '/rental-application' : '',
  basePath: process.env.NODE_ENV === 'production' ? '/rental-application' : '',
}

module.exports = nextConfig
