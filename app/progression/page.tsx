import { connection } from "next/server";
import { ensureSeedUser } from "@/data/user";
import { getStreakForUser } from "@/data/streak";
import { computeBadges } from "@/domain/badges";
import { StreakHero } from "@/components/progression/streak-hero";
import { BadgeGrid } from "@/components/progression/badge-grid";

export default async function ProgressionPage() {
  // Même garde que app/edt/page.tsx -- sans elle, Next.js pourrait figer
  // cette page au moment du build (aucune "Request-time API" ne la rend
  // dynamique d'elle-même, cf. AGENTS.md).
  await connection();

  const user = await ensureSeedUser();
  const streak = await getStreakForUser(user.id, new Date());
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
