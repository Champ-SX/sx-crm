import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Order → Purchasing → Inventory. Old links (bookmarks, bell notifications,
  // push messages, shared stock/asset links) keep working.
  async redirects() {
    return [
      { source: '/anf-order', destination: '/inventory', permanent: true },
      { source: '/anf-order/:path*', destination: '/inventory/:path*', permanent: true },
      { source: '/purchasing', destination: '/inventory', permanent: true },
      { source: '/purchasing/products', destination: '/inventory/event-products', permanent: true },
      { source: '/purchasing/:path*', destination: '/inventory/:path*', permanent: true },
    ]
  },
};

export default nextConfig;
