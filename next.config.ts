import type { NextConfig } from "next";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.PAGES_BASE_PATH || "",
  images: { unoptimized: true },
  outputFileTracingRoot: __dirname,
  webpack: (config) => {
    config.resolve.modules = [resolve(__dirname, "node_modules"), "node_modules"];
    return config;
  },
};

export default nextConfig;
