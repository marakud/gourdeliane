import path from "node:path";
import { defineConfig } from "vitest/config";

// Miroir de l'alias "@/*" -> "./*" de tsconfig.json (paths) : sans ce fichier,
// Vitest (Vite) ne connaît pas cet alias et ne peut résoudre aucun import
// "@/..." utilisé par le code applicatif (ex. data/schedule.ts -> @/domain/schedule).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
