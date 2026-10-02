import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  reactStrictMode: true,
  transpilePackages: [
    '@frameforge/types',
    '@frameforge/timecode',
    '@frameforge/ui',
    '@frameforge/contracts'
  ]
};

export default nextConfig;
