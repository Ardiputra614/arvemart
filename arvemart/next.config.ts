import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  generateBuildId: async () => {
  return Date.now().toString();
},

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    unoptimized: false,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "images.duitku.com", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "8080" },
      { protocol: "https", hostname: "api.arvemart.com" },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://api.arvemart.com/api/:path*",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;