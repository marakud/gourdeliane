import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Un package.json/package-lock.json preexistant vit dans le dossier parent
  // (Cours/) pour un autre projet non lie -- on fixe explicitement la racine
  // pour eviter que Turbopack ne la detecte par erreur comme workspace root.
  turbopack: {
    root: path.join(__dirname),
  },
  // Les Prisma driver adapters (better-sqlite3 en dev, pg en prod) embarquent
  // des bindings natifs -- on les garde hors du bundle serverless de Next
  // pour que Vercel les charge tels quels plutot que de les tracer/bundler.
  serverExternalPackages: [
    "better-sqlite3",
    "pg",
    "@prisma/adapter-better-sqlite3",
    "@prisma/adapter-pg",
  ],
};

export default nextConfig;
