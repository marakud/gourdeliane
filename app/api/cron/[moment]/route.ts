import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { ensureSeedUser } from "@/data/user";
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
    const user = await ensureSeedUser();

    // "Aujourd'hui" calculé serveur en America/Guadeloupe fixe (AD-4), jamais
    // depuis l'heure du serveur cron elle-même (qui tourne en UTC).
    const now = new Date();
    const todayDate = getTodaySchoolDate(now);
    const todayIso = schoolDateToIso(todayDate);
    const todayWeekday = schoolDateToWeekday(todayDate);

    const { noSchoolDays } = await getScheduleForUser(user.id);
    const noSchoolDayIsoSet = new Set(
      noSchoolDays.map((day) => day.date.toISOString().slice(0, 10))
    );

    if (shouldSkipReminderToday(todayWeekday, todayIso, noSchoolDayIsoSet)) {
      return Response.json({ skipped: true, reason: "no-school-day" });
    }

    const { sent, removed } = await sendPushToUser(
      user.id,
      NOTIFICATION_CONTENT[moment]
    );

    return Response.json({ skipped: false, sent, removed });
  } catch (error) {
    console.error(`Cron ${momentSegment} a échoué:`, error);
    return Response.json({ error: "Erreur interne." }, { status: 500 });
  }
}
