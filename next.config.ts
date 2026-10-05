import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opening the dev server as 127.0.0.1 otherwise blocks the client bundle,
  // so buttons such as Continue with Google never attach.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
