import { defineConfig, env } from "prisma/config";
import "dotenv/config";

// Config Prisma pour le DEV LOCAL (schéma SQLite par défaut).
// Le pipeline de déploiement Vercel utilise explicitement
// prisma/schema.production.prisma via `--schema` (voir README / .env.example) --
// ce fichier de config n'est pas utilisé en production.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
