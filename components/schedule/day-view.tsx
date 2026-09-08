import { Check, NotebookPen } from "lucide-react";
import { SubjectTag } from "@/components/schedule/subject-tag";
import { cn } from "@/lib/utils";

// Vue lecture seule d'un jour (Story 1.3, "Aujourd'hui"/"Demain") -- pas de
// bouton modifier/supprimer ici (cf. spec 1.3, section Never : cette story
// est une lecture, pas une écriture ; l'édition reste sur la vue Semaine).
// `devoirs` (Story 2.4, retour utilisateur "programmer le devoir dans
// l'EDT") : liste en lecture seule elle aussi -- cocher/supprimer un devoir
// reste réservé au bloc "Devoirs" d'Accueil, pas dupliqué ici. `subject` par
// devoir (distinct de celui du créneau) : un devoir peut être rattaché à un
// créneau d'une autre matière que la sienne -- l'afficher évite toute
// ambiguïté plutôt que de laisser croire qu'il porte sur la matière du
// créneau.
export interface DayViewSlot {
  id: string;
  startTime: string;
  endTime: string;
  subject: { name: string; colorIndex: number };
  devoirs?: {
    id: string;
    description: string;
    done: boolean;
    subject: { name: string; colorIndex: number };
  }[];
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
          className="flex flex-col gap-2 rounded-2xl bg-muted px-3 py-2"
        >
          <div className="flex min-h-[44px] items-center gap-3">
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
          </div>
          {slot.devoirs && slot.devoirs.length > 0 && (
            <ul className="flex flex-col gap-1 pl-[52px]">
              {slot.devoirs.map((devoir) => {
                // Un devoir peut être rattaché à un créneau d'une autre
                // matière que la sienne (ex. une révision de maths notée
                // depuis le créneau d'EPS) -- ne préciser la matière du
                // devoir que si elle diffère de celle du créneau, pour ne
                // pas alourdir le cas courant (même matière).
                const differentSubject = devoir.subject.name !== slot.subject.name;
                return (
                  <li
                    key={devoir.id}
                    className={cn(
                      "flex items-center gap-1.5 text-sm",
                      devoir.done
                        ? "text-muted-foreground/70 line-through"
                        : "text-muted-foreground"
                    )}
                  >
                    {devoir.done ? (
                      <Check aria-hidden="true" className="size-3.5 shrink-0" />
                    ) : (
                      <NotebookPen aria-hidden="true" className="size-3.5 shrink-0" />
                    )}
                    <span className="truncate">
                      {differentSubject && `${devoir.subject.name} · `}
                      {devoir.description}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
