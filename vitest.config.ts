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
  test: {
    // Plusieurs fichiers de test (data/schedule.test.ts, data/checklist.test.ts)
    // sont des tests d'intégration contre le même fichier SQLite dev.db (pas
    // d'infra de base de test dédiée, cf. leur en-tête). Vitest lance les
    // fichiers de test en parallèle par défaut, ce qui ouvre plusieurs
    // connexions SQLite concurrentes vers le même fichier -- provoque des
    // timeouts ("database is locked") plutôt qu'une vraie erreur de logique.
    // Un seul fichier à la fois évite ça ; la suite reste rapide (peu de tests).
    fileParallelism: false,
  },
});
