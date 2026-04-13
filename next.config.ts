import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gp.lopesecia.com.br",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lopesecia.com.br",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.catalogoambev.com.br",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
