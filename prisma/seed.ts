import { prisma } from "../data/prisma";

// Depuis l'ajout de l'authentification multi-famille, plus rien à
// pré-remplir ici -- chaque famille crée son propre `User` via l'inscription
// (actions/auth.ts::registerAction), jamais un seed unique à l'avance.
// Conservé comme vérification de connectivité (le pipeline `build:vercel`
// l'appelle après `migrate deploy`) plutôt que supprimé, pour ne pas casser
// `prisma db seed`/`prisma.config.ts`.
async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.log("Seed OK -- base accessible, aucun utilisateur à pré-remplir.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect().catch((error) => console.error(error)));
