import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next's server action body defaults to 1MB, which the new-attraction
      // form (submitted as multipart FormData with tickets attached) would
      // blow past almost immediately. Set comfortably above our per-file
      // 10MB ticket cap to allow a few tickets in one submission.
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
