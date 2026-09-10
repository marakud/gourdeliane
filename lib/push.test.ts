import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Tests unitaires (pas d'intégration DB/réseau réel ici, contrairement aux
// scratch-scripts manuels utilisés pendant l'implémentation) -- `web-push`
// et data/push-subscription sont mockés pour exercer précisément la logique
// de fan-out/nettoyage de `sendPushToUser` (Boundaries spec 3.1 : un
// abonnement en échec n'affecte jamais les autres).

const sendNotificationMock = vi.fn();
const setVapidDetailsMock = vi.fn();
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: (...args: unknown[]) => setVapidDetailsMock(...args),
    sendNotification: (...args: unknown[]) => sendNotificationMock(...args),
  },
}));

const listSubscriptionsForUserMock = vi.fn();
const deleteSubscriptionMock = vi.fn();
vi.mock("@/data/push-subscription", () => ({
  listSubscriptionsForUser: (...args: unknown[]) =>
    listSubscriptionsForUserMock(...args),
  deleteSubscription: (...args: unknown[]) => deleteSubscriptionMock(...args),
}));

function subscription(endpoint: string) {
  return { id: endpoint, userId: "user-1", endpoint, p256dh: "p", auth: "a", createdAt: new Date() };
}

beforeEach(() => {
  vi.stubEnv("VAPID_PUBLIC_KEY", "test-public");
  vi.stubEnv("VAPID_PRIVATE_KEY", "test-private");
  vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  vi.resetModules();
});

describe("sendPushToUser (spec 3.1)", () => {
  it("envoie à tous les abonnements et compte les succès", async () => {
    const { sendPushToUser } = await import("./push");
    listSubscriptionsForUserMock.mockResolvedValue([
      subscription("https://push.example/a"),
      subscription("https://push.example/b"),
    ]);
    sendNotificationMock.mockResolvedValue(undefined);

    const result = await sendPushToUser("user-1", { title: "t", body: "b" });

    expect(result).toEqual({ sent: 2, removed: 0 });
    expect(deleteSubscriptionMock).not.toHaveBeenCalled();
  });

  it("supprime un abonnement en échec 404/410 sans affecter les autres", async () => {
    const { sendPushToUser } = await import("./push");
    listSubscriptionsForUserMock.mockResolvedValue([
      subscription("https://push.example/stale"),
      subscription("https://push.example/ok"),
    ]);
    sendNotificationMock.mockImplementation(async (target: { endpoint: string }) => {
      if (target.endpoint.endsWith("stale")) {
        const error = new Error("Gone") as Error & { statusCode: number };
        error.statusCode = 410;
        throw error;
      }
    });
    deleteSubscriptionMock.mockResolvedValue(undefined);

    const result = await sendPushToUser("user-1", { title: "t", body: "b" });

    expect(result).toEqual({ sent: 1, removed: 1 });
    expect(deleteSubscriptionMock).toHaveBeenCalledWith("https://push.example/stale");
  });

  it("un échec de deleteSubscription ne fait pas perdre le décompte des autres abonnements", async () => {
    const { sendPushToUser } = await import("./push");
    listSubscriptionsForUserMock.mockResolvedValue([
      subscription("https://push.example/stale"),
      subscription("https://push.example/ok"),
    ]);
    sendNotificationMock.mockImplementation(async (target: { endpoint: string }) => {
      if (target.endpoint.endsWith("stale")) {
        const error = new Error("Not Found") as Error & { statusCode: number };
        error.statusCode = 404;
        throw error;
      }
    });
    deleteSubscriptionMock.mockRejectedValue(new Error("db down"));

    const result = await sendPushToUser("user-1", { title: "t", body: "b" });

    // Le sent=1 (l'autre abonnement) doit survivre même si la suppression du
    // premier échoue -- c'est exactement le bug que la revue a signalé
    // (deleteSubscription non protégé aurait fait rejeter tout Promise.all).
    expect(result.sent).toBe(1);
  });

  it("un échec non-404/410 n'est ni compté ni supprimé", async () => {
    const { sendPushToUser } = await import("./push");
    listSubscriptionsForUserMock.mockResolvedValue([subscription("https://push.example/err")]);
    sendNotificationMock.mockRejectedValue(new Error("network error"));

    const result = await sendPushToUser("user-1", { title: "t", body: "b" });

    expect(result).toEqual({ sent: 0, removed: 0 });
    expect(deleteSubscriptionMock).not.toHaveBeenCalled();
  });

  it("lève une erreur explicite si les variables VAPID sont manquantes", async () => {
    vi.unstubAllEnvs();
    const { sendPushToUser } = await import("./push");
    await expect(sendPushToUser("user-1", { title: "t", body: "b" })).rejects.toThrow(
      /VAPID/
    );
  });
});
