import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Premier test de Route Handler du repo -- pas de convention établie
// (cf. actions/*.test.ts pour les Server Actions). Toutes les dépendances
// data/lib sont mockées : ce test vérifie le contrat HTTP de la route
// (401/400/200, ordre auth-avant-validation, skip) -- pas la persistance
// réelle, déjà couverte par lib/push.test.ts et les vérifications manuelles
// consignées dans la spec 3.1.

const ensureSeedUserMock = vi.fn();
vi.mock("@/data/user", () => ({
  ensureSeedUser: (...args: unknown[]) => ensureSeedUserMock(...args),
}));

const getScheduleForUserMock = vi.fn();
vi.mock("@/data/schedule", () => ({
  getScheduleForUser: (...args: unknown[]) => getScheduleForUserMock(...args),
}));

const sendPushToUserMock = vi.fn();
vi.mock("@/lib/push", () => ({
  sendPushToUser: (...args: unknown[]) => sendPushToUserMock(...args),
}));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("https://example.com/api/cron/soir", { headers });
}

function params(moment: string) {
  return { params: Promise.resolve({ moment }) };
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "test-secret");
  ensureSeedUserMock.mockResolvedValue({ id: "user-1" });
  getScheduleForUserMock.mockResolvedValue({ noSchoolDays: [] });
  sendPushToUserMock.mockResolvedValue({ sent: 1, removed: 0 });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  vi.resetModules();
});

describe("GET /api/cron/[moment] -- authentification (spec 3.1)", () => {
  it("401 quand le header Authorization est absent", async () => {
    const { GET } = await import("./route");
    const response = await GET(request(), params("soir"));
    expect(response.status).toBe(401);
    expect(sendPushToUserMock).not.toHaveBeenCalled();
  });

  it("401 quand le secret ne correspond pas", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      request({ authorization: "Bearer wrong-secret" }),
      params("soir")
    );
    expect(response.status).toBe(401);
  });

  it("401 avant la validation du moment -- ne fuite pas l'existence d'une route valide (ordre confirmé en revue)", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      request({ authorization: "Bearer wrong-secret" }),
      params("moment-inconnu")
    );
    expect(response.status).toBe(401);
  });
});

describe("GET /api/cron/[moment] -- validation (spec 3.1)", () => {
  it("400 pour un moment inconnu (secret correct)", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      request({ authorization: "Bearer test-secret" }),
      params("moment-inconnu")
    );
    expect(response.status).toBe(400);
  });
});

describe("GET /api/cron/[moment] -- envoi (spec 3.1)", () => {
  it("200 et envoie la notification pour un jour scolaire normal", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      request({ authorization: "Bearer test-secret" }),
      params("soir")
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ skipped: false, sent: 1, removed: 0 });
    expect(sendPushToUserMock).toHaveBeenCalledTimes(1);
  });

  it("skip sans envoyer un jour marqué NoSchoolDay", async () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    getScheduleForUserMock.mockResolvedValue({
      noSchoolDays: [{ date: new Date(`${todayIso}T00:00:00.000Z`) }],
    });

    const { GET } = await import("./route");
    const response = await GET(
      request({ authorization: "Bearer test-secret" }),
      params("matin")
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ skipped: true, reason: "no-school-day" });
    expect(sendPushToUserMock).not.toHaveBeenCalled();
  });

  it("500 avec un corps diagnosticable si une dépendance lève (jamais un crash silencieux)", async () => {
    sendPushToUserMock.mockRejectedValue(new Error("VAPID mal configurée"));

    const { GET } = await import("./route");
    const response = await GET(
      request({ authorization: "Bearer test-secret" }),
      params("retour")
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
