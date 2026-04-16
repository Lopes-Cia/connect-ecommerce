import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4000",
        pathname: "/**",
      },
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
