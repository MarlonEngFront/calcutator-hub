import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 'export' necessário para Firebase Hosting (static). Em dev usa SSR normal.
  ...(isDev ? {} : { output: 'export' }),
  trailingSlash: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
}

export default nextConfig
