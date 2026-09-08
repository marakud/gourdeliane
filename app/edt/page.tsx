import { connection } from "next/server";
import { ensureSeedUser } from "@/data/user";
import { getScheduleForUser } from "@/data/schedule";
import { listDevoirs } from "@/data/homework";
import { EdtViewTabs } from "@/components/schedule/edt-view-tabs";
import { AddHomeworkFab } from "@/components/homework/add-homework-fab";
import {
  deriveDaySlots,
  formatSlotLabel,
  type Weekday,
} from "@/domain/schedule";
import { attachDevoirsToSlots } from "@/domain/homework";
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

  const todaySlots = deriveDaySlots(
    slots,
    todayWeekday,
    todayIso,
    noSchoolDayIsoSet
  );
  const tomorrowSlots = deriveDaySlots(
    slots,
    tomorrowWeekday,
    tomorrowIso,
    noSchoolDayIsoSet
  );

  // Devoirs rattachés à un créneau (Story 2.4, retour utilisateur
  // "programmer le devoir dans l'EDT") : affichage en lecture seule sous le
  // créneau concerné dans "Aujourd'hui"/"Demain" -- cocher/supprimer reste
  // réservé au bloc "Devoirs" d'Accueil (Code Map). `attachDevoirsToSlots`
  // (domain/homework.ts, testé) fait le regroupement -- jamais recalculé ici.
  const devoirs = await listDevoirs(user.id);
  const todaySlotsWithDevoirs = attachDevoirsToSlots(todaySlots, devoirs);
  const tomorrowSlotsWithDevoirs = attachDevoirsToSlots(tomorrowSlots, devoirs);

  const homeworkScheduleSlots = slots.map((slot) => ({
    id: slot.id,
    label: formatSlotLabel(slot),
  }));

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
          slots: todaySlotsWithDevoirs,
          emptyMessage: "Pas cours aujourd'hui, profite de ta journée !",
        }}
        tomorrow={{
          slots: tomorrowSlotsWithDevoirs,
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
        scheduleSlots={homeworkScheduleSlots}
      />
    </div>
  );
}
