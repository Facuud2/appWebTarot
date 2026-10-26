import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    "*.devtunnels.ms",
    "*.github.dev",
    "*.ngrok-free.app",
    "*.trycloudflare.com",
    "*.loca.lt",
  ],
};

export default nextConfig;

