
import type {NextConfig} from 'next';
import withPWAInit from 'next-pwa';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // For Google user avatars
        port: '',
        pathname: '/**',
      }
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals.push('handlebars');
    }
    return config;
  },
};

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: isDev,
});

// Conditionally apply the PWA wrapper.
// In development, we export the plain nextConfig.
// In production, we export the PWA-wrapped config.
const finalConfig = isDev ? nextConfig : withPWA(nextConfig);

export default finalConfig;
