import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // three ships ESM examples (GLTFExporter, OrbitControls); transpile so the server bundle resolves them.
  transpilePackages: ['three'],
  images: {
    remotePatterns: [
      {protocol: 'https', hostname: 'i.pravatar.cc'},
      {protocol: 'https', hostname: 'images.unsplash.com'},
    ],
  },
};

export default nextConfig;
