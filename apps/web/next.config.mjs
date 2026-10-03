import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.FRAMEFORGE_BUILD_DIR || '.next',
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  reactStrictMode: true,
  // Local previews use a same-origin API proxy, keeping browser private-network
  // protection intact. Disabled unless explicitly configured for a loopback API.
  async rewrites() {
    const target = process.env.FRAMEFORGE_LOCAL_API_PROXY;
    if (!target || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(target)) return [];
    return [{ source: '/api/v1/:path*', destination: `${target}/api/v1/:path*` }];
  },
  transpilePackages: [
    '@frameforge/types',
    '@frameforge/timecode',
    '@frameforge/ui',
    '@frameforge/contracts'
  ]
};

export default nextConfig;
