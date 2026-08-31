import path from "node:path";

import { defineConfig } from "vitest/config";

const authRoot = path.resolve(import.meta.dirname, "src/features/auth");
const landingRoot = path.resolve(import.meta.dirname, "src/features/landing");
const sharedRoot = path.resolve(import.meta.dirname, "src/shared");

export default defineConfig({
  resolve: {
    alias: [
      { find: "@shared", replacement: path.join(sharedRoot, "index.ts") },
      { find: /^@auth\/(.+)$/, replacement: `${authRoot}/$1` },
      { find: "@auth", replacement: path.join(authRoot, "index.ts") },
      { find: /^@landing\/(.+)$/, replacement: `${landingRoot}/$1` },
      { find: "@landing", replacement: path.join(landingRoot, "index.ts") },
    ],
  },
});
