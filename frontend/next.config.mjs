/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Dev-only proxy: routes /api/* to the local FastAPI server.
  // In production NEXT_PUBLIC_API_BASE_URL is set to the Railway URL,
  // so api.ts builds absolute URLs and these rewrites are never reached.
  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
      {
        source: "/health",
        destination: "http://localhost:8000/health",
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
