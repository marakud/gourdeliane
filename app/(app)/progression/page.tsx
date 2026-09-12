import { connection } from "next/server";
import { requireUserId } from "@/lib/current-user";
import { getStreakForUser } from "@/data/streak";
import { computeBadges } from "@/domain/badges";
import { StreakHero } from "@/components/progression/streak-hero";
import { BadgeGrid } from "@/components/progression/badge-grid";

export default async function ProgressionPage() {
  // Même garde que app/edt/page.tsx -- sans elle, Next.js pourrait figer
  // cette page au moment du build (aucune "Request-time API" ne la rend
  // dynamique d'elle-même, cf. AGENTS.md).
  await connection();

  const userId = await requireUserId();
  // Le streak est un affichage secondaire, jamais un chemin critique --
  // une donnée historique inattendue ne doit jamais faire planter tout
  // l'écran Progression (contrairement à un échec sur Accueil/EDT, qui
  // resterait un vrai bug bloquant). En cas d'erreur, `console.error` reste
  // visible dans les logs serveur (Vercel) pour diagnostiquer, l'écran
  // retombe sur 0/0 -- jamais un streak inventé.
  let streak = { current: 0, best: 0 };
  try {
    streak = await getStreakForUser(userId, new Date());
  } catch (error) {
    console.error("getStreakForUser a échoué, repli sur 0/0 :", error);
  }
  const badges = computeBadges(streak.best);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Progression
        </h1>
        <p className="text-base text-muted-foreground">
          Ton streak et tes badges.
        </p>
      </div>

      <StreakHero current={streak.current} best={streak.best} />
      <BadgeGrid badges={badges} />
    </div>
  );
}
