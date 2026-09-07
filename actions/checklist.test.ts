import "dotenv/config";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "../data/prisma";
import { toggleChecklistItem, toggleMatinChecklistItem } from "./checklist";

// Tests d'intégration contre la vraie base de dev (SQLite). Contrairement à
// data/schedule.test.ts / data/checklist.test.ts (fonctions data/ prenant un
// userId explicite), ces actions appellent en interne `ensureSeedUser()` --
// pas de userId synthétique possible ici, elles agissent toujours sur
// l'utilisateur unique réel de l'app (cohérent avec le reste du produit).
// Le nettoyage se fait donc par `sourceId` (distinctif à chaque test) plutôt
// que par userId.
//
// `revalidatePath` lève hors d'une requête Next.js (confirmé pendant la
// revue de la story 2.2) -- avalé par `safeRevalidate`, donc ces actions
// restent testables directement ici sans serveur Next.js démarré.
const TEST_SOURCE_IDS = [
  "action-test-sac-item",
  "action-test-bad-type",
  "action-test-bad-source",
  "action-test-matin-item",
];

afterEach(async () => {
  await prisma.checklistItemState.deleteMany({
    where: { sourceId: { in: TEST_SOURCE_IDS } },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("toggleChecklistItem -- valeurs par défaut (spec 2.2, généralisation)", () => {
  it("écrit SAC/SUBJECT_ITEM quand checklistType/sourceType ne sont pas fournis (compat SacChecklist)", async () => {
    const result = await toggleChecklistItem({
      date: "2026-12-20",
      sourceId: "action-test-sac-item",
      checked: true,
    });

    expect(result.ok).toBe(true);

    const rows = await prisma.checklistItemState.findMany({
      where: { sourceId: "action-test-sac-item" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].checklistType).toBe("SAC");
    expect(rows[0].sourceType).toBe("SUBJECT_ITEM");
  });

  it("rejette un checklistType/sourceType inconnu plutôt que d'écrire une ligne orpheline", async () => {
    const badType = await toggleChecklistItem({
      date: "2026-12-20",
      sourceId: "action-test-bad-type",
      checked: true,
      checklistType: "NIMPORTEQUOI",
    });
    expect(badType.ok).toBe(false);

    const badSource = await toggleChecklistItem({
      date: "2026-12-20",
      sourceId: "action-test-bad-source",
      checked: true,
      sourceType: "NIMPORTEQUOI",
    });
    expect(badSource.ok).toBe(false);

    const rows = await prisma.checklistItemState.findMany({
      where: { sourceId: { in: ["action-test-bad-type", "action-test-bad-source"] } },
    });
    expect(rows).toHaveLength(0);
  });
});

describe("toggleMatinChecklistItem -- wrapper MATIN/FIXED_ITEM (spec 2.2)", () => {
  it("écrit MATIN/FIXED_ITEM sans que l'appelant ait à connaître ces constantes", async () => {
    const result = await toggleMatinChecklistItem({
      date: "2026-12-20",
      sourceId: "action-test-matin-item",
      checked: true,
    });

    expect(result.ok).toBe(true);

    const rows = await prisma.checklistItemState.findMany({
      where: { sourceId: "action-test-matin-item" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].checklistType).toBe("MATIN");
    expect(rows[0].sourceType).toBe("FIXED_ITEM");
  });
});
