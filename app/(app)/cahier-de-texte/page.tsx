import { connection } from "next/server";
import { requireUserId } from "@/lib/current-user";
import { getScheduleForUser } from "@/data/schedule";
import { listLessonLogs } from "@/data/lesson-log";
import { deleteLessonLogAction } from "@/actions/lesson-log";
import { getTodaySchoolDate, schoolDateToIso } from "@/domain/school-day";
import { formatLessonLogDateLabel, type LessonLogView as LessonLogViewModel } from "@/domain/lesson-log";
import { LessonLogView } from "@/components/lesson-log/lesson-log-view";
import { AddLessonLogFab } from "@/components/lesson-log/add-lesson-log-fab";

// "Cahier de texte" (évolution CartableFlow, retour utilisateur) -- trace de
// ce qui a été vu en cours, matière par matière, jour par jour. Sert de base
// pour savoir quoi revoir avant le prochain cours, une évaluation, ou le
// week-end (relecture de la semaine passée) -- distinct de "Révisions du
// jour" (Accueil), qui n'est qu'un rappel à cocher, sans contenu.
export default async function CahierDeTextePage() {
  // Même garde que app/edt/page.tsx / app/mes-taches/page.tsx.
  await connection();

  const userId = await requireUserId();
  const { subjects } = await getScheduleForUser(userId);
  const logs = await listLessonLogs(userId);

  const todayIso = schoolDateToIso(getTodaySchoolDate(new Date()));

  const logsView: LessonLogViewModel[] = logs.map((log) => {
    const dateIso = log.date.toISOString().slice(0, 10);
    return {
      id: log.id,
      dateIso,
      dateLabel: formatLessonLogDateLabel(dateIso),
      content: log.content,
      subject: {
        id: log.subject.id,
        name: log.subject.name,
        colorIndex: log.subject.colorIndex,
      },
    };
  });

  const lessonLogSubjects = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    colorIndex: subject.colorIndex,
  }));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Cahier de texte
        </h1>
        <p className="text-base text-muted-foreground">
          Ce qui a été vu en cours, pour préparer le prochain cours ou une
          évaluation.
        </p>
      </div>

      <LessonLogView
        logs={logsView}
        subjects={lessonLogSubjects}
        todayIso={todayIso}
        onDelete={deleteLessonLogAction}
      />

      <AddLessonLogFab subjects={lessonLogSubjects} defaultDateIso={todayIso} />
    </div>
  );
}
