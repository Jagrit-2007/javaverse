import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  generateBuildId: async () => 'javaverse-build',
};

export default nextConfig;
