import { connection } from "next/server";
import { ensureSeedUser } from "@/data/user";
import { listFixedChecklistItems, listSubjectsWithItems } from "@/data/checklist";
import {
  CHECKLIST_TYPE_MATIN,
  CHECKLIST_TYPE_RETOUR,
  DEFAULT_MATIN_ITEMS,
  DEFAULT_RETOUR_ITEMS,
} from "@/domain/checklist";
import { computeWeekParity } from "@/domain/schedule";
import { getTodaySchoolDate, schoolDateToIso } from "@/domain/school-day";
import {
  createFixedChecklistItem,
  createRetourChecklistItem,
} from "@/actions/checklist";
import { setCurrentWeekParity, setFirstNameAction } from "@/actions/settings";
import { subscribeToPush } from "@/actions/push";
import { SubjectItemsManager } from "@/components/checklist/subject-items-manager";
import { FixedItemsManager } from "@/components/checklist/fixed-items-manager";
import { WeekParityCard } from "@/components/settings/week-parity-card";
import { FirstNameCard } from "@/components/settings/first-name-card";
import { NotificationsSection } from "@/components/settings/notifications-section";

export default async function ReglagesPage() {
  // Force le rendu dynamique à chaque requête (AGENTS.md -- modèle de cache
  // "component-level" de cette version de Next.js), cf. app/edt/page.tsx :
  // sans ceci, la lecture Prisma pourrait être figée au moment du build et
  // ne jamais refléter un objet ajouté/modifié/supprimé après coup.
  await connection();

  const user = await ensureSeedUser();
  const [subjects, matinItems, retourItems] = await Promise.all([
    listSubjectsWithItems(user.id),
    listFixedChecklistItems(user.id, CHECKLIST_TYPE_MATIN, DEFAULT_MATIN_ITEMS),
    listFixedChecklistItems(user.id, CHECKLIST_TYPE_RETOUR, DEFAULT_RETOUR_ITEMS),
  ]);

  // Semaine A/B (Story 1.4) : la parité affichée porte sur AUJOURD'HUI
  // (America/Guadeloupe, AD-4), calculée seulement si une référence existe déjà.
  const todayIso = schoolDateToIso(getTodaySchoolDate(new Date()));
  const weekAReferenceMondayIso = user.weekAReferenceMonday
    ? user.weekAReferenceMonday.toISOString().slice(0, 10)
    : null;
  const currentParity = weekAReferenceMondayIso
    ? computeWeekParity(todayIso, weekAReferenceMondayIso)
    : null;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Réglages
        </h1>
        <p className="text-base text-muted-foreground">
          Gère les objets par défaut de chaque matière -- utilisés pour
          préparer le sac du soir. Une modification s&apos;applique à toutes
          les prochaines fois où cette matière a cours.
        </p>
      </div>

      <FirstNameCard firstName={user.firstName} onSetFirstName={setFirstNameAction} />

      <WeekParityCard currentParity={currentParity} onSetParity={setCurrentWeekParity} />

      {process.env.VAPID_PUBLIC_KEY && (
        <NotificationsSection
          vapidPublicKey={process.env.VAPID_PUBLIC_KEY}
          onSubscribe={subscribeToPush}
        />
      )}

      <SubjectItemsManager
        subjects={subjects.map((subject) => ({
          id: subject.id,
          name: subject.name,
          colorIndex: subject.colorIndex,
          items: subject.items.map((item) => ({
            id: item.id,
            label: item.label,
          })),
        }))}
      />

      <FixedItemsManager
        title="Ce matin"
        items={matinItems.map((item) => ({ id: item.id, label: item.label }))}
        createAction={createFixedChecklistItem}
      />

      <FixedItemsManager
        title="Retour"
        items={retourItems.map((item) => ({ id: item.id, label: item.label }))}
        createAction={createRetourChecklistItem}
      />
    </div>
  );
}
