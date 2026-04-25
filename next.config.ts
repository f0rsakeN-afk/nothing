import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.1.91"],

  // =================== SPEED OPTIMIZATIONS ===================

  modularizeImports: {
    "date-fns": {
      transform: "date-fns/{{member}}",
    },
  },

  experimental: {
    optimizePackageImports: [
      "@tanstack/react-query",
      "lucide-react",
      "@hugeicons/react",
      "@hugeicons/core-free-icons",
      "@base-ui/react",
      "framer-motion",
      "date-fns",
      "recharts",
      "sileo",
      "mermaid",
    ],
    optimizeCss: true,
    serverActions: {
      bodySizeLimit: "256mb",
    },
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
    turbopackFileSystemCacheForDev: true,
  },

  // =================== PRODUCTION OPTIMIZATIONS ===================

  productionBrowserSourceMaps: false,

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000, // 1 year
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  // Optimize chunk splitting
  webpack: (config) => {
    config.optimization = config.optimization || {};
    config.optimization.splitChunks = {
      chunks: "all",
      minSize: 20000,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      cacheGroups: {
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          priority: -10,
          chunks: "all",
        },
        // Separate large deps into own chunks
        framerMotion: {
          test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
          name: "framer-motion",
          priority: 20,
          chunks: "all",
        },
        recharts: {
          test: /[\\/]node_modules[\\/]recharts[\\/]/,
          name: "recharts",
          priority: 20,
          chunks: "all",
        },
      },
    };
    return config;
  },

  devIndicators: false,

  async headers() {
    return [
      {
        source: "/((?!privacy-policy|terms|about).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/(privacy-policy|terms|about)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
