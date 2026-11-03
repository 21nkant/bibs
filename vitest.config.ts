import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
    setupFiles: ["lib/service/test-env.ts"],
    // Integration tests talk to the real (remote) database.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
