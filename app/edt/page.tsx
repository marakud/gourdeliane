import { ensureSeedUser } from "@/data/user";
import { getScheduleForUser } from "@/data/schedule";
import { WeekSchedule } from "@/components/schedule/week-schedule";
import type { Weekday } from "@/domain/schedule";

export default async function EdtPage() {
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
      <WeekSchedule
        slots={slots}
        subjectNames={subjectNames}
        noSchoolDays={noSchoolDayDates}
      />
    </div>
  );
}
