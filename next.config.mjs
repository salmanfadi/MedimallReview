/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow a separate build directory when the default .next folder is managed by OneDrive.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
