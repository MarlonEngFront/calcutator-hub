import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    dirs: ['app', 'lib'],
  },
  // node-fetch e dependências nativas — não bundlar no server
  serverExternalPackages: [],
}

export default nextConfig
