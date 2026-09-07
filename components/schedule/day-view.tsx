import { SubjectTag } from "@/components/schedule/subject-tag";

// Vue lecture seule d'un jour (Story 1.3, "Aujourd'hui"/"Demain") -- pas de
// bouton modifier/supprimer ici (cf. spec 1.3, section Never : cette story
// est une lecture, pas une écriture ; l'édition reste sur la vue Semaine).
export interface DayViewSlot {
  id: string;
  startTime: string;
  endTime: string;
  subject: { name: string; colorIndex: number };
}

export interface DayViewProps {
  slots: DayViewSlot[];
  // Message neutre et positif (UX-DR10) affiché quand `slots` est vide, que
  // ce soit un `NoSchoolDay` explicite ou simplement un jour de la semaine
  // sans créneau saisi -- l'appelant (app/edt/page.tsx) ne distingue pas les
  // deux cas, l'enfant s'en fiche de la raison (I/O matrix spec 1.3).
  emptyMessage: string;
}

export function DayView({ slots, emptyMessage }: DayViewProps) {
  if (slots.length === 0) {
    return (
      <p className="rounded-2xl bg-card px-4 py-8 text-center text-base text-muted-foreground ring-1 ring-border">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {slots.map((slot) => (
        <li
          key={slot.id}
          className="flex min-h-[44px] items-center gap-3 rounded-2xl bg-muted px-3 py-2"
        >
          <SubjectTag
            name={slot.subject.name}
            colorIndex={slot.subject.colorIndex}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-semibold text-foreground">
              {slot.subject.name}
            </span>
            <span className="text-sm text-muted-foreground">
              {slot.startTime} – {slot.endTime}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
