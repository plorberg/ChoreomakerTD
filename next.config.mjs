/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  experimental: {
    // react-konva is client-only; we import it dynamically
  },
  webpack: (config) => {
    // Konva needs 'canvas' aliased away in browser bundle
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};
export default nextConfig;
