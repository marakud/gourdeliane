import { connection } from "next/server";
import { ensureSeedUser } from "@/data/user";
import { listFixedChecklistItems, listSubjectsWithItems } from "@/data/checklist";
import {
  CHECKLIST_TYPE_MATIN,
  CHECKLIST_TYPE_RETOUR,
  DEFAULT_MATIN_ITEMS,
  DEFAULT_RETOUR_ITEMS,
} from "@/domain/checklist";
import {
  createFixedChecklistItem,
  createRetourChecklistItem,
} from "@/actions/checklist";
import { SubjectItemsManager } from "@/components/checklist/subject-items-manager";
import { FixedItemsManager } from "@/components/checklist/fixed-items-manager";

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
