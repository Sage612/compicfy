/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "localhost",
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "") || "",
      "lh3.googleusercontent.com", // Google avatars
      "avatars.githubusercontent.com", // GitHub avatars
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  swcMinify: true,
};

module.exports = nextConfig;
