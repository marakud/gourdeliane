import { connection } from "next/server";
import { ensureSeedUser } from "@/data/user";
import { getScheduleForUser } from "@/data/schedule";
import { listDevoirs } from "@/data/homework";
import { EdtViewTabs } from "@/components/schedule/edt-view-tabs";
import { AddHomeworkFab } from "@/components/homework/add-homework-fab";
import { computeWeekParity, deriveDaySlots, type WeekParity, type Weekday } from "@/domain/schedule";
import { filterDevoirsForWeekday } from "@/domain/homework";
import {
  getTodaySchoolDate,
  getTomorrowSchoolDate,
  schoolDateToIso,
  schoolDateToWeekday,
} from "@/domain/school-day";

export default async function EdtPage() {
  // Sans ceci, Next.js (modèle de cache "component-level" -- AGENTS.md)
  // pourrait figer cette page au moment du build : ni `new Date()` ni la
  // requête Prisma (pilote better-sqlite3 synchrone en dev) ne sont des
  // "Request-time APIs" qui la rendraient dynamique d'elles-mêmes.
  // `connection()` force l'exécution à chaque requête, condition sine qua
  // non pour qu'"aujourd'hui"/"demain" (AD-4) se recalculent à chaque
  // chargement de page plutôt que de rester bloqués au jour du déploiement.
  await connection();

  const user = await ensureSeedUser();
  const { subjects, scheduleSlots, noSchoolDays } = await getScheduleForUser(
    user.id
  );

  const slots = scheduleSlots.map((slot) => ({
    id: slot.id,
    weekday: slot.weekday as Weekday,
    startTime: slot.startTime,
    endTime: slot.endTime,
    weekParity: slot.weekParity as WeekParity | null,
    subject: { name: slot.subject.name, colorIndex: slot.subject.colorIndex },
  }));

  const subjectNames = subjects.map((subject) => subject.name);

  const noSchoolDayDates = noSchoolDays.map((day) => ({
    // toISOString() -> "yyyy-MM-ddTHH:mm:ss.sssZ" ; on ne garde que la date
    // calendaire, `date` étant déjà normalisée à minuit UTC (data/schedule.ts).
    date: day.date.toISOString().slice(0, 10),
  }));
  const noSchoolDayIsoSet = new Set(noSchoolDayDates.map((day) => day.date));

  // "Aujourd'hui"/"Demain" : calcul serveur en Europe/Paris fixe (AD-4),
  // jamais depuis l'heure locale du client -- `now` est résolu une seule
  // fois ici et passé explicitement aux fonctions pures de domain/school-day.
  const now = new Date();
  const todayDate = getTodaySchoolDate(now);
  const tomorrowDate = getTomorrowSchoolDate(now);
  const todayIso = schoolDateToIso(todayDate);
  const tomorrowIso = schoolDateToIso(tomorrowDate);
  const todayWeekday = schoolDateToWeekday(todayDate);
  const tomorrowWeekday = schoolDateToWeekday(tomorrowDate);

  // Semaine A/B (Story 1.4) : la parité est calculée séparément pour
  // aujourd'hui et demain -- jamais réutilisée telle quelle, un changement
  // de semaine peut tomber entre les deux (ex. aujourd'hui dimanche, demain
  // lundi). `null` (référence non configurée) ne filtre que les créneaux
  // "toutes les semaines" (cf. deriveDaySlots).
  const weekAReferenceMondayIso = user.weekAReferenceMonday
    ? user.weekAReferenceMonday.toISOString().slice(0, 10)
    : null;
  const todayParity = weekAReferenceMondayIso
    ? computeWeekParity(todayIso, weekAReferenceMondayIso)
    : null;
  const tomorrowParity = weekAReferenceMondayIso
    ? computeWeekParity(tomorrowIso, weekAReferenceMondayIso)
    : null;

  const todaySlots = deriveDaySlots(
    slots,
    todayWeekday,
    todayIso,
    noSchoolDayIsoSet,
    todayParity
  );
  const tomorrowSlots = deriveDaySlots(
    slots,
    tomorrowWeekday,
    tomorrowIso,
    noSchoolDayIsoSet,
    tomorrowParity
  );

  // Devoirs programmés dans un trou libre (Story 2.4, retour utilisateur
  // "programmer le devoir dans l'EDT" -- disponibilité réelle, pas un
  // rattachement à un cours) : affichage en lecture seule dans
  // "Aujourd'hui"/"Demain" -- cocher/supprimer reste réservé au bloc
  // "Devoirs" d'Accueil (Code Map). Indépendant de `noSchoolDayIsoSet` : un
  // jour "sans cours" n'annule pas le temps personnel que l'enfant s'est
  // programmé ce jour-là.
  const devoirs = await listDevoirs(user.id);
  const todayPlannedDevoirs = filterDevoirsForWeekday(devoirs, todayWeekday);
  const tomorrowPlannedDevoirs = filterDevoirsForWeekday(devoirs, tomorrowWeekday);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Emploi du temps
        </h1>
        <p className="text-base text-muted-foreground">
          Tes créneaux de la semaine, identiques chaque semaine.
        </p>
      </div>
      <EdtViewTabs
        today={{
          slots: todaySlots,
          plannedDevoirs: todayPlannedDevoirs,
          emptyMessage: "Pas cours aujourd'hui, profite de ta journée !",
        }}
        tomorrow={{
          slots: tomorrowSlots,
          plannedDevoirs: tomorrowPlannedDevoirs,
          emptyMessage: "Pas cours demain, profite de ta soirée !",
        }}
        week={{
          slots,
          subjectNames,
          noSchoolDays: noSchoolDayDates,
        }}
      />

      <AddHomeworkFab
        subjects={subjects.map((subject) => ({
          id: subject.id,
          name: subject.name,
          colorIndex: subject.colorIndex,
        }))}
        scheduleSlots={slots}
      />
    </div>
  );
}
