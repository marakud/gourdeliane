// CartableFlow -- domain/homework.ts (Story 2.4)
//
// Dérivation pure liée aux devoirs. Aucune dépendance vers Next.js ou Prisma
// (AD-1 / domain/README.md) ; aucune fonction ici ne lit l'horloge système --
// les dates "aujourd'hui" sont toujours reçues en `todayIso` explicite par
// l'appelant (app/(accueil)/page.tsx, calculé via domain/school-day.ts).

/**
 * Nombre de jours calendaires entre `todayIso` et `echeanceIso` (positif si
 * l'échéance est à venir, 0 si aujourd'hui, négatif si dépassée). Les deux
 * dates sont des chaînes "yyyy-MM-dd" (même format que
 * domain/school-day.ts::schoolDateToIso) -- comparées via `Date.UTC` à minuit
 * (jamais l'heure locale du serveur), les deux opérandes ancrés de façon
 * identique donc sans risque de frontière DST malgré l'absence d'ancrage
 * midi (contrairement à getTomorrowSchoolDate, qui ancre à midi car il fait
 * de l'arithmétique de jour ; ici on ne fait qu'une soustraction entre deux
 * instants déjà résolus).
 */
export function computeDaysRemaining(
  echeanceIso: string,
  todayIso: string
): number {
  const echeance = Date.UTC(
    ...(parseIsoDate(echeanceIso) as [number, number, number])
  );
  const today = Date.UTC(...(parseIsoDate(todayIso) as [number, number, number]));
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((echeance - today) / msPerDay);
}

function parseIsoDate(iso: string): [number, number, number] {
  const [year, month, day] = iso.split("-").map(Number);
  return [year, month - 1, day];
}

/** Un devoir tel qu'attaché à un créneau EDT (Story 2.4, retour utilisateur
 * "programmer le devoir dans l'EDT") -- projection minimale affichée en
 * lecture seule sous le créneau concerné (components/schedule/day-view.tsx).
 */
export interface DevoirSlotAttachment {
  id: string;
  description: string;
  done: boolean;
  subject: { name: string; colorIndex: number };
}

/**
 * Regroupe les devoirs rattachés (`scheduleSlotId` non nul) par créneau, et
 * les attache à la liste de créneaux fournie (une entrée par créneau, tableau
 * vide -> `undefined`, jamais `[]`, pour que l'appelant puisse tester
 * `slot.devoirs?.length` sans distinguo). Pure : ne fait aucune requête,
 * reçoit `slots`/`devoirs` déjà chargés par l'appelant (app/edt/page.tsx).
 * Un devoir dont le `scheduleSlotId` ne correspond à aucun `slot` fourni est
 * silencieusement ignoré (ex. créneau d'un autre jour de la semaine que la
 * vue "Aujourd'hui"/"Demain" en cours n'a pas chargé).
 */
export function attachDevoirsToSlots<S extends { id: string }>(
  slots: readonly S[],
  devoirs: readonly {
    id: string;
    description: string;
    done: boolean;
    scheduleSlotId: string | null;
    subject: { name: string; colorIndex: number };
  }[]
): (S & { devoirs: DevoirSlotAttachment[] | undefined })[] {
  const bySlotId = new Map<string, DevoirSlotAttachment[]>();
  for (const devoir of devoirs) {
    if (!devoir.scheduleSlotId) continue;
    const list = bySlotId.get(devoir.scheduleSlotId) ?? [];
    list.push({
      id: devoir.id,
      description: devoir.description,
      done: devoir.done,
      subject: devoir.subject,
    });
    bySlotId.set(devoir.scheduleSlotId, list);
  }
  return slots.map((slot) => ({ ...slot, devoirs: bySlotId.get(slot.id) }));
}
