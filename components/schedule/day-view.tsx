import { Check, NotebookPen } from "lucide-react";
import { SubjectTag } from "@/components/schedule/subject-tag";
import { cn } from "@/lib/utils";

// Vue lecture seule d'un jour (Story 1.3, "Aujourd'hui"/"Demain") -- pas de
// bouton modifier/supprimer ici (cf. spec 1.3, section Never : cette story
// est une lecture, pas une écriture ; l'édition reste sur la vue Semaine).
export interface DayViewSlot {
  id: string;
  startTime: string;
  endTime: string;
  subject: { name: string; colorIndex: number };
}

// Devoir programmé ce jour-là (Story 2.4, retour utilisateur "programmer le
// devoir dans l'EDT" -- placé dans un trou libre, PAS rattaché à un
// créneau/cours, cf. domain/schedule.ts::computeWeeklyFreeGaps). Liste en
// lecture seule elle aussi -- cocher/supprimer un devoir reste réservé au
// bloc "Devoirs" d'Accueil, pas dupliqué ici. Indépendante de `slots` :
// un devoir programmé reste affiché même un jour sans cours (temps
// personnel de l'enfant, pas un cours).
export interface DayViewPlannedDevoir {
  id: string;
  description: string;
  done: boolean;
  subject: { name: string; colorIndex: number };
  plannedStartTime: string;
}

export interface DayViewProps {
  slots: DayViewSlot[];
  plannedDevoirs?: DayViewPlannedDevoir[];
  // Message neutre et positif (UX-DR10) affiché quand `slots` est vide, que
  // ce soit un `NoSchoolDay` explicite ou simplement un jour de la semaine
  // sans créneau saisi -- l'appelant (app/edt/page.tsx) ne distingue pas les
  // deux cas, l'enfant s'en fiche de la raison (I/O matrix spec 1.3).
  emptyMessage: string;
}

export function DayView({ slots, plannedDevoirs = [], emptyMessage }: DayViewProps) {
  return (
    <div className="flex flex-col gap-3">
      {slots.length === 0 ? (
        <p className="rounded-2xl bg-card px-4 py-8 text-center text-base text-muted-foreground ring-1 ring-border">
          {emptyMessage}
        </p>
      ) : (
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
      )}

      {plannedDevoirs.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-3 ring-1 ring-border">
          <span className="text-xs font-medium text-muted-foreground">
            Devoirs programmés
          </span>
          <ul className="flex flex-col gap-1.5">
            {plannedDevoirs.map((devoir) => (
              <li
                key={devoir.id}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  devoir.done
                    ? "text-muted-foreground/70 line-through"
                    : "text-foreground"
                )}
              >
                {devoir.done ? (
                  <Check aria-hidden="true" className="size-3.5 shrink-0" />
                ) : (
                  <NotebookPen aria-hidden="true" className="size-3.5 shrink-0" />
                )}
                <span className="shrink-0 text-muted-foreground">
                  {devoir.plannedStartTime}
                </span>
                <SubjectTag
                  name={devoir.subject.name}
                  colorIndex={devoir.subject.colorIndex}
                  className="size-5 shrink-0 text-[0.6rem]"
                />
                <span className="truncate">{devoir.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
