import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // On Next 14 use experimental flag; Next 15 supports top-level.
  experimental: {
    outputFileTracingRoot: path.join(process.cwd()),
  },
};

export default nextConfig;
