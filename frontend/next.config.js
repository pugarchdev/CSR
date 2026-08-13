/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows CI/verification builds to avoid colliding with a running local dev
  // server's .next directory.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  swcMinify: true,
  outputFileTracing: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
      },
    ],
  },
  experimental: {
    optimizeCss: false,
    // Tree-shake big icon/chart/heavy libs to only the imports actually used —
    // dramatically shrinks per-page JS and speeds up client navigation.
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@tanstack/react-query",
      "axios",
      "three",
      "html2canvas",
      "jspdf"
    ],
    webVitalsAttribution: ["CLS", "LCP", "FCP", "INP", "TTFB"]
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
