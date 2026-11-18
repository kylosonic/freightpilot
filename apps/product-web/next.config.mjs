/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare serves the static export from apps/product-web/out.
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Pin tracing to this app so a lockfile in the user's home cannot move the
  // workspace root outside the repository.
  outputFileTracingRoot: import.meta.dirname,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
