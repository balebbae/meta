import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // native onnxruntime-node binding; must stay a runtime require, not bundled (lib/activities/classify.ts)
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node'],
  images: {
    remotePatterns: [
      {protocol: 'https', hostname: 'i.pravatar.cc'},
      {protocol: 'https', hostname: 'images.unsplash.com'},
    ],
  },
};

export default nextConfig;
