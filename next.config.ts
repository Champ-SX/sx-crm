import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Order menu became Purchasing. Old links (bookmarks, bell notifications,
  // push messages, shared stock/asset links) keep working.
  async redirects() {
    return [
      { source: '/anf-order', destination: '/purchasing', permanent: true },
      { source: '/anf-order/:path*', destination: '/purchasing/:path*', permanent: true },
    ]
  },
};

export default nextConfig;
