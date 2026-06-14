import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",          // évite le DataCloneError avec axios
    testTimeout: 15000,      // 15s au lieu de 5s par défaut
    hookTimeout: 15000,
  },
});