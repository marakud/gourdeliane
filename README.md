This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Base de données (dev vs production)

CartableFlow utilise deux schémas Prisma, chacun avec son propre dossier de
migrations (Prisma verrouille le provider d'un dossier de migrations dans
`migration_lock.toml` -- les partager entre SQLite et Postgres casse `migrate
deploy` avec l'erreur P3019) :

- `prisma/schema.prisma` + `prisma/migrations/` (SQLite) -- utilisé par défaut en dev local via `prisma.config.ts`. `npm install` déclenche automatiquement `prisma generate` (script `postinstall`).
- `prisma/production/schema.prisma` + `prisma/production/migrations/` (Postgres/Supabase) -- utilisé uniquement par le build de production (`npm run build:vercel`, déclaré comme `buildCommand` dans `vercel.json`), qui enchaîne génération du client, `prisma migrate deploy` et le seed contre `DATABASE_URL`.

Les deux schémas doivent rester synchronisés à la main (seul le `provider` du `datasource` diffère) -- voir les commentaires en tête de chaque fichier. Idem pour leurs migrations : toute évolution du modèle doit être répercutée dans les deux dossiers (`prisma migrate dev` pour SQLite, `prisma migrate diff --from-empty --to-schema prisma/production/schema.prisma --script` pour générer le SQL Postgres équivalent hors-ligne, sans connexion réelle).

⚠️ Sur Supabase, utilise la connection string **Session pooler** (port `5432`, hôte `*.pooler.supabase.com`) pour `DATABASE_URL`, pas le Transaction pooler (port `6543`) : `prisma migrate deploy` a besoin d'une connexion qui tient un état de session, ce que le mode transaction ne permet pas.

Pour tester le pipeline de production en local contre un Postgres/Supabase jetable :

```bash
DATABASE_URL="postgresql://..." npm run build:vercel
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
