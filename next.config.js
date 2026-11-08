import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
     serverComponentsExternalPackages: ["sharp", "fluent-ffmpeg", "@whiskeysockets/baileys"]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('tiktok-video-scraper');
    }
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    }
    return config;
  },
};

export default withPWA(nextConfig);
