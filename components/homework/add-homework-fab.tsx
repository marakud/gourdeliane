"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HomeworkFormDialog,
  type HomeworkFormDialogSlot,
  type HomeworkFormDialogSubject,
} from "@/components/homework/homework-form-dialog";

// FAB "Ajouter un devoir", dupliqué sur Accueil et EDT (Boundaries spec 2.4 :
// pas de layout partagé pour ces deux routes, cf. app/layout.tsx) -- même
// composant instancié deux fois plutôt que d'introduire un wrapper
// conditionnel sur usePathname() (Design Notes). Formulaire factorisé dans
// `HomeworkFormDialog` (retour utilisateur -- partagé avec l'édition d'un
// devoir existant depuis `DevoirsList`).

export type AddHomeworkFabSubject = HomeworkFormDialogSubject;
export type AddHomeworkFabSlot = HomeworkFormDialogSlot;

export interface AddHomeworkFabProps {
  subjects: AddHomeworkFabSubject[];
  scheduleSlots?: AddHomeworkFabSlot[];
}

export function AddHomeworkFab({
  subjects,
  scheduleSlots = [],
}: AddHomeworkFabProps) {
  return (
    <HomeworkFormDialog
      subjects={subjects}
      scheduleSlots={scheduleSlots}
      trigger={
        <Button
          type="button"
          aria-label="Ajouter un devoir"
          className="fixed bottom-20 right-4 z-20 size-14 rounded-full shadow-lg"
        >
          <Plus aria-hidden="true" className="size-6" />
        </Button>
      }
    />
  );
}
