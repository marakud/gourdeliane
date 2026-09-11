import { prisma } from "./prisma";
import { getScheduleForUser } from "./schedule";
import {
  computeWeekParity,
  deriveDaySlots,
  shiftIsoDays,
  type WeekParity,
  type Weekday,
} from "@/domain/schedule";
import {
  getTodaySchoolDate,
  schoolDateToIso,
  schoolDateToWeekday,
} from "@/domain/school-day";
import {
  computeStreak,
  type DayCompletionRecord,
  type StreakResult,
} from "@/domain/streak";
import { DAY_COMPLETION_MOMENT_SOIR } from "@/domain/day-completion";

// Refonte visuelle étape 8 -- lit les lignes `DayCompletion(moment=SOIR)`
// déjà persistées (Story 2.7) et reconstruit, pour la même plage de dates,
// l'ensemble des jours scolaires en réutilisant `deriveDaySlots` (lecture
// seule, même fonction déjà consommée par app/edt/page.tsx et
// app/(accueil)/page.tsx) -- aucune règle métier nouvelle, juste un nouveau
// point de lecture. Le calcul du streak lui-même (domain/streak.ts) reste
// pur et testé indépendamment de cette orchestration.
export async function getStreakForUser(
  userId: string,
  now: Date
): Promise<StreakResult> {
  const rows = await prisma.dayCompletion.findMany({
    where: { userId, moment: DAY_COMPLETION_MOMENT_SOIR },
    orderBy: { date: "asc" },
  });

  if (rows.length === 0) {
    return { current: 0, best: 0 };
  }

  const records: DayCompletionRecord[] = rows.map((row) => ({
    dateIso: row.date.toISOString().slice(0, 10),
    complete: row.complete,
  }));

  const todayIso = schoolDateToIso(getTodaySchoolDate(now));
  // `records[0].dateIso` ("rows" déjà triées par date croissante) borné à un
  // an en arrière : sans cette borne, une ligne historique très ancienne (ou
  // une date corrompue) ferait tourner la reconstruction des jours scolaires
  // ci-dessous sur une plage arbitrairement grande -- un "meilleur streak"
  // au-delà d'un an n'a de toute façon aucun sens produit ici (FR-14 ne parle
  // que de paliers jusqu'à 100 jours, domain/badges.ts).
  const earliestIso =
    records[0].dateIso > shiftIsoDays(todayIso, -366)
      ? records[0].dateIso
      : shiftIsoDays(todayIso, -366);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const weekAReferenceMondayIso = user.weekAReferenceMonday
    ? user.weekAReferenceMonday.toISOString().slice(0, 10)
    : null;
  const { scheduleSlots, noSchoolDays } = await getScheduleForUser(userId);
  const slots = scheduleSlots.map((slot) => ({
    id: slot.id,
    weekday: slot.weekday as Weekday,
    startTime: slot.startTime,
    endTime: slot.endTime,
    weekParity: slot.weekParity as WeekParity | null,
    subject: { name: slot.subject.name, colorIndex: slot.subject.colorIndex },
  }));
  const noSchoolDayIsoSet = new Set(
    noSchoolDays.map((day) => day.date.toISOString().slice(0, 10))
  );

  // "Jour scolaire" = au moins un créneau ce jour-là selon le même gabarit
  // hebdomadaire que l'EDT (poids semaine A/B compris), moins les jours
  // explicitement marqués sans cours -- `deriveDaySlots` gère déjà les deux.
  const schoolDayIsoSet = new Set<string>();
  for (
    let dateIso = earliestIso;
    dateIso <= todayIso;
    dateIso = shiftIsoDays(dateIso, 1)
  ) {
    const weekday = schoolDateToWeekday({
      year: Number(dateIso.slice(0, 4)),
      month: Number(dateIso.slice(5, 7)),
      day: Number(dateIso.slice(8, 10)),
    });
    const weekParity = weekAReferenceMondayIso
      ? computeWeekParity(dateIso, weekAReferenceMondayIso)
      : null;
    const daySlots = deriveDaySlots(
      slots,
      weekday,
      dateIso,
      noSchoolDayIsoSet,
      weekParity
    );
    if (daySlots.length > 0) {
      schoolDayIsoSet.add(dateIso);
    }
  }

  return computeStreak(records, schoolDayIsoSet, todayIso);
}
