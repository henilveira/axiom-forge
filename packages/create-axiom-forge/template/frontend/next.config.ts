import type { NextConfig } from "next";

import { resolveAuthBackendUrl, resolveAuthPublicOrigin } from "./src/shared/config";

if (process.env["NODE_ENV"] === "production") {
  resolveAuthBackendUrl(process.env);
  resolveAuthPublicOrigin(process.env);
}

const nextConfig: NextConfig = {
  turbopack: {
    // Cada feature real declara aqui o mesmo alias exato do tsconfig.json.
    resolveAlias: {
      "@": "./src/index.ts",
      "@shared": "./src/shared/index.ts",
      "@auth": "./src/features/auth/index.ts",
      "@landing": "./src/features/landing/index.ts",
      "@landing/constants": "./src/features/landing/constants/index.ts",
    },
  },
  async headers() {
    return [
      {
        source: "/email/verify",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
