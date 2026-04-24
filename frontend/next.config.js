/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Performance
  compress: true,
  poweredByHeader: false,

  // Build ID explicite (evite TypeError "generate is not a function" avec
  // Next 14.2.35 quand le champ est absent de la config).
  generateBuildId: async () => null,

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://unpkg.com",
              "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
              "font-src 'self' data:",
              "connect-src 'self' ws: wss: http://localhost:8000 https://pnpi-gabon.ga",
              "frame-src 'none'",
            ].join("; "),
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
          },
        ],
      },
    ];
  },

  // Image configuration
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.tile.openstreetmap.org" },
    ],
  },
};

module.exports = nextConfig;
