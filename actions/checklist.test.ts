import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../data/prisma";
import { listFixedChecklistItems } from "../data/checklist";
import {
  CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
  CHECKLIST_TYPE_MATIN,
  DEFAULT_MATIN_ITEMS,
} from "../domain/checklist";
import {
  createRetourChecklistItem,
  toggleChecklistItem,
  toggleMatinChecklistItem,
  toggleRetourChecklistItem,
  toggleRevisionsChecklistItem,
} from "./checklist";

// Tests d'intégration contre la vraie base de dev (SQLite). Ces actions
// résolvent désormais l'utilisateur depuis la session (`requireUserId`,
// lib/current-user.ts, authentification multi-famille) -- mocké ici vers un
// utilisateur de test synthétique (même convention que data/day-completion.test.ts),
// jamais le vrai utilisateur unique d'avant l'authentification. Le nettoyage
// se fait par `sourceId` (distinctif à chaque test) plutôt que par userId,
// pour garder l'isolation déjà en place entre les `it()` de ce fichier.
//
// `revalidatePath` lève hors d'une requête Next.js (confirmé pendant la
// revue de la story 2.2) -- avalé par `safeRevalidate`, donc ces actions
// restent testables directement ici sans serveur Next.js démarré.
const TEST_USER_ID = "test-user-actions-checklist";

vi.mock("@/lib/current-user", () => ({
  requireUserId: async () => TEST_USER_ID,
}));

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID },
  });
});

const TEST_SOURCE_IDS = [
  "action-test-sac-item",
  "action-test-bad-type",
  "action-test-bad-source",
  "action-test-matin-item",
  "action-test-retour-item",
  "action-test-devoir-a-rendre-item",
  "action-test-revisions-item",
];

const TEST_RETOUR_CREATE_LABEL = "action-test-retour-create-label";

afterEach(async () => {
  await prisma.checklistItemState.deleteMany({
    where: { sourceId: { in: TEST_SOURCE_IDS } },
  });
  await prisma.fixedChecklistItem.deleteMany({
    where: { label: TEST_RETOUR_CREATE_LABEL },
  });
});

afterAll(async () => {
  // Story 2.7 -- `toggleChecklistItem`/`toggleRevisionsChecklistItem`
  // appellent désormais `recomputeAndPersistSoirCompletion` sur l'utilisateur
  // de test (`TEST_USER_ID`, via `requireUserId` mocké) avec `new Date()` --
  // chaque test ci-dessus écrit donc aussi une ligne `DayCompletion` (SOIR,
  // aujourd'hui réel). `onDelete: Cascade` sur `User` nettoie tout en un
  // coup (même convention que data/day-completion.test.ts), plus simple que
  // cibler `DayCompletion` seule.
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
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

  it("accepte sourceType=DEVOIR_A_RENDRE (Story 2.5, FR-18)", async () => {
    const result = await toggleChecklistItem({
      date: "2026-12-20",
      sourceId: "action-test-devoir-a-rendre-item",
      checked: true,
      sourceType: CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
    });

    expect(result.ok).toBe(true);

    const rows = await prisma.checklistItemState.findMany({
      where: { sourceId: "action-test-devoir-a-rendre-item" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].checklistType).toBe("SAC");
    expect(rows[0].sourceType).toBe(CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE);
    expect(rows[0].checked).toBe(true);
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

describe("toggleRetourChecklistItem -- wrapper RETOUR/FIXED_ITEM (spec 2.3)", () => {
  it("écrit RETOUR/FIXED_ITEM sans que l'appelant ait à connaître ces constantes", async () => {
    const result = await toggleRetourChecklistItem({
      date: "2026-12-20",
      sourceId: "action-test-retour-item",
      checked: true,
    });

    expect(result.ok).toBe(true);

    const rows = await prisma.checklistItemState.findMany({
      where: { sourceId: "action-test-retour-item" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].checklistType).toBe("RETOUR");
    expect(rows[0].sourceType).toBe("FIXED_ITEM");
  });

  it("reste indépendant de MATIN -- même sourceId, checklistType différent, deux lignes distinctes", async () => {
    await toggleMatinChecklistItem({
      date: "2026-12-20",
      sourceId: "action-test-matin-item",
      checked: true,
    });
    await toggleRetourChecklistItem({
      date: "2026-12-20",
      sourceId: "action-test-matin-item",
      checked: false,
    });

    const rows = await prisma.checklistItemState.findMany({
      where: { sourceId: "action-test-matin-item" },
      orderBy: { checklistType: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.checklistType === "MATIN")?.checked).toBe(true);
    expect(rows.find((row) => row.checklistType === "RETOUR")?.checked).toBe(false);
  });
});

describe("toggleRevisionsChecklistItem -- wrapper REVISIONS/SUBJECT (spec 2.6, FR-19)", () => {
  it("écrit REVISIONS/SUBJECT sans que l'appelant ait à connaître ces constantes", async () => {
    const result = await toggleRevisionsChecklistItem({
      date: "2026-12-20",
      sourceId: "action-test-revisions-item",
      checked: true,
    });

    expect(result.ok).toBe(true);

    const rows = await prisma.checklistItemState.findMany({
      where: { sourceId: "action-test-revisions-item" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].checklistType).toBe("REVISIONS");
    expect(rows[0].sourceType).toBe("SUBJECT");
    expect(rows[0].checked).toBe(true);
  });

  it("reste indépendant de MATIN/RETOUR -- même sourceId, checklistType différent", async () => {
    await toggleMatinChecklistItem({
      date: "2026-12-20",
      sourceId: "action-test-revisions-item",
      checked: true,
    });
    await toggleRevisionsChecklistItem({
      date: "2026-12-20",
      sourceId: "action-test-revisions-item",
      checked: false,
    });

    const rows = await prisma.checklistItemState.findMany({
      where: { sourceId: "action-test-revisions-item" },
      orderBy: { checklistType: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.checklistType === "MATIN")?.checked).toBe(true);
    expect(rows.find((row) => row.checklistType === "REVISIONS")?.checked).toBe(false);
  });
});

describe("createRetourChecklistItem -- création RETOUR (spec 2.3)", () => {
  it("crée un FixedChecklistItem de type RETOUR", async () => {
    const result = await createRetourChecklistItem({
      label: TEST_RETOUR_CREATE_LABEL,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const item = await prisma.fixedChecklistItem.findUnique({
      where: { id: result.data.id },
    });
    expect(item?.checklistType).toBe("RETOUR");
    expect(item?.label).toBe(TEST_RETOUR_CREATE_LABEL);
  });

  it("rejette un label vide", async () => {
    const result = await createRetourChecklistItem({ label: "   " });
    expect(result.ok).toBe(false);
  });

  it("ne fuite pas dans la liste MATIN (types indépendants)", async () => {
    const result = await createRetourChecklistItem({
      label: TEST_RETOUR_CREATE_LABEL,
    });
    expect(result.ok).toBe(true);

    const matinItems = await listFixedChecklistItems(
      TEST_USER_ID,
      CHECKLIST_TYPE_MATIN,
      DEFAULT_MATIN_ITEMS
    );
    expect(
      matinItems.some((item) => item.label === TEST_RETOUR_CREATE_LABEL)
    ).toBe(false);
  });
});
