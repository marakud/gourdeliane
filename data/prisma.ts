import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 : le client a besoin d'un driver adapter explicite (plus d'URL dans
// le schema). CartableFlow utilise SQLite en dev local et Postgres (Supabase)
// en production -- voir prisma/schema.prisma vs prisma/schema.production.prisma.
//
// `process.env.VERCEL` est positionne automatiquement par la plateforme Vercel
// (jamais en local, meme avec `npm run build`/`NODE_ENV=production`), ce qui
// permet de choisir le bon adapter sans dependre de NODE_ENV.
function createAdapter() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL est absente. Voir .env.example (SQLite en dev, Postgres/Supabase en prod)."
    );
  }

  if (process.env.VERCEL) {
    return new PrismaPg(databaseUrl);
  }

  return new PrismaBetterSqlite3({ url: databaseUrl });
}

// Pattern standard Next.js : reutiliser une seule instance de PrismaClient en
// dev pour eviter d'ouvrir une nouvelle connexion a chaque hot-reload.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
