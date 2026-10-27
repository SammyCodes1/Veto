import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mysten-incubation/memwal", "@mysten/seal"],
};

export default nextConfig;
