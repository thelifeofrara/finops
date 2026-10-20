import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "nodemailer"],
  // Bank statements and e-qaimə exports are uploaded through server actions (default limit 1 MB).
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
