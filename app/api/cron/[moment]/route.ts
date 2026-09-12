import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/data/prisma";
import { getScheduleForUser } from "@/data/schedule";
import { getTodaySchoolDate, schoolDateToIso, schoolDateToWeekday } from "@/domain/school-day";
import {
  NOTIFICATION_CONTENT,
  shouldSkipReminderToday,
  type NotificationMoment,
} from "@/domain/notifications";
import { sendPushToUser } from "@/lib/push";

// Comparaison en temps constant pour éviter une fuite d'information par
// timing sur le secret cron (Boundaries spec 3.1 : authentification
// obligatoire) -- `!==` sur des chaînes de longueurs différentes est aussi
// géré explicitement, `timingSafeEqual` exige des buffers de même taille.
function isValidCronSecret(authHeader: string | null, cronSecret: string): boolean {
  if (!authHeader) return false;
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authHeader);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

// Story 3.1 -- une route par moment (SOIR/MATIN/RETOUR), chacune invoquée
// par son propre Vercel Cron Job (vercel.json, AD-8) -- jamais une route
// générique qui devine le moment depuis l'heure d'exécution. `moment` dans
// l'URL est en minuscules (convention Vercel Cron/URL), converti vers la
// valeur `NotificationMoment` en majuscules utilisée partout ailleurs.

const MOMENT_BY_URL_SEGMENT: Record<string, NotificationMoment> = {
  soir: "SOIR",
  matin: "MATIN",
  retour: "RETOUR",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moment: string }> }
) {
  // Protège contre un appel public non authentifié (Boundaries spec 3.1) --
  // Vercel envoie automatiquement ce header quand CRON_SECRET est configurée
  // sur le projet.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || !isValidCronSecret(authHeader, cronSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { moment: momentSegment } = await params;
  const moment = MOMENT_BY_URL_SEGMENT[momentSegment];
  if (!moment) {
    return Response.json({ error: "Moment inconnu." }, { status: 400 });
  }

  // Toute la logique métier est protégée : une erreur inattendue (VAPID mal
  // configurée sur Vercel, DB indisponible...) doit produire une réponse
  // diagnosticable plutôt qu'un 500 opaque sans corps, et ne doit jamais
  // faire échouer silencieusement le Cron Job pour toujours.
  try {
    // Authentification multi-famille -- un rappel par famille, jamais un
    // seul utilisateur unique (ancien `ensureSeedUser()`). Chaque famille est
    // traitée indépendamment (try/catch par utilisateur, plus bas) : l'échec
    // d'une famille (VAPID, EDT mal configuré...) ne doit jamais empêcher les
    // autres de recevoir leur rappel.
    const users = await prisma.user.findMany({ select: { id: true } });

    // "Aujourd'hui" calculé serveur en America/Guadeloupe fixe (AD-4), jamais
    // depuis l'heure du serveur cron elle-même (qui tourne en UTC) --
    // identique pour toutes les familles (fuseau unique, AD-4).
    const now = new Date();
    const todayDate = getTodaySchoolDate(now);
    const todayIso = schoolDateToIso(todayDate);
    const todayWeekday = schoolDateToWeekday(todayDate);

    let totalSent = 0;
    let totalRemoved = 0;
    let skippedNoSchool = 0;
    const failedUserIds: string[] = [];

    for (const user of users) {
      try {
        const { noSchoolDays } = await getScheduleForUser(user.id);
        const noSchoolDayIsoSet = new Set(
          noSchoolDays.map((day) => day.date.toISOString().slice(0, 10))
        );

        if (shouldSkipReminderToday(todayWeekday, todayIso, noSchoolDayIsoSet)) {
          skippedNoSchool += 1;
          continue;
        }

        const { sent, removed } = await sendPushToUser(
          user.id,
          NOTIFICATION_CONTENT[moment]
        );
        totalSent += sent;
        totalRemoved += removed;
      } catch (error) {
        console.error(`Cron ${momentSegment} a échoué pour l'utilisateur ${user.id}:`, error);
        failedUserIds.push(user.id);
      }
    }

    return Response.json({
      totalUsers: users.length,
      skippedNoSchool,
      sent: totalSent,
      removed: totalRemoved,
      failedUserIds,
    });
  } catch (error) {
    console.error(`Cron ${momentSegment} a échoué:`, error);
    return Response.json({ error: "Erreur interne." }, { status: 500 });
  }
}
