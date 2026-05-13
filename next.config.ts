import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.TAURI ? "export" : (process.env.NEXT_OUTPUT || "standalone"),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: [],
  allowedDevOrigins: [
    // Allow preview panel cross-origin requests from sandbox subdomains
    "**.space-z.ai",
  ],
};

export default nextConfig;
