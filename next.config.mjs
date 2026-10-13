/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "djfptkcnbanbagrgntuz.supabase.co",
      },
    ],
  },
  // "Watchdog" was renamed to "Issues"; keep old links working.
  async redirects() {
    return [
      { source: "/watchdog", destination: "/issues", permanent: true },
      { source: "/watchdog/:path*", destination: "/issues/:path*", permanent: true },
    ];
  },
  experimental: {
    // keep existing experimental flags here (currently empty)
  },
};

export default nextConfig;
