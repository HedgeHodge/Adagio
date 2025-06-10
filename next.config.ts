
import type {NextConfig} from 'next';
import withPWAInit from 'next-pwa';

const pwaConfig = {
  // dest: 'public', // Often not needed when register: true, next-pwa handles it.
  register: true,
  skipWaiting: true,
  disable: false, // Enabled PWA in development for testing install prompt
  // You can add more PWA options here, like runtime caching strategies
  // fallbacks: {
  //   document: '/offline', // Example: specify a custom offline fallback page
  // },
};

const withPWA = withPWAInit(pwaConfig);

const nextConfig: NextConfig = {
  /* config options here */
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
};

export default withPWA(nextConfig);
