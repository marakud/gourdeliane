import "dotenv/config";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "../data/prisma";
import { subscribeToPush } from "./push";

// Tests d'intégration contre la vraie base de dev (SQLite), même convention
// que actions/checklist.test.ts -- `subscribeToPush` appelle en interne
// `ensureSeedUser()`, pas de userId synthétique possible. Nettoyage par
// `endpoint` (distinctif à chaque test).
const TEST_ENDPOINTS = [
  "https://push.example/action-test-valid",
  "https://push.example/action-test-upsert",
];

afterEach(async () => {
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: { in: TEST_ENDPOINTS } },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("subscribeToPush -- validation (spec 3.1)", () => {
  it("rejette un endpoint vide", async () => {
    const result = await subscribeToPush({
      endpoint: "   ",
      keys: { p256dh: "abc", auth: "def" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejette des clés vides", async () => {
    const result = await subscribeToPush({
      endpoint: TEST_ENDPOINTS[0],
      keys: { p256dh: "", auth: "def" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejette un input sans `keys` sans lever d'exception (endpoint HTTP appelable directement)", async () => {
    const malformed = {
      endpoint: TEST_ENDPOINTS[0],
    } as unknown as Parameters<typeof subscribeToPush>[0];

    const result = await subscribeToPush(malformed);
    expect(result.ok).toBe(false);
  });
});

describe("subscribeToPush -- persistance (spec 3.1)", () => {
  it("crée un PushSubscription valide", async () => {
    const result = await subscribeToPush({
      endpoint: TEST_ENDPOINTS[0],
      keys: { p256dh: "test-p256dh", auth: "test-auth" },
    });

    expect(result.ok).toBe(true);

    const row = await prisma.pushSubscription.findUnique({
      where: { endpoint: TEST_ENDPOINTS[0] },
    });
    expect(row?.p256dh).toBe("test-p256dh");
    expect(row?.auth).toBe("test-auth");
  });

  it("upsert -- un second abonnement sur le même endpoint met à jour plutôt que dupliquer", async () => {
    await subscribeToPush({
      endpoint: TEST_ENDPOINTS[1],
      keys: { p256dh: "first", auth: "first" },
    });
    const second = await subscribeToPush({
      endpoint: TEST_ENDPOINTS[1],
      keys: { p256dh: "second", auth: "second" },
    });
    expect(second.ok).toBe(true);

    const rows = await prisma.pushSubscription.findMany({
      where: { endpoint: TEST_ENDPOINTS[1] },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].p256dh).toBe("second");
  });
});
