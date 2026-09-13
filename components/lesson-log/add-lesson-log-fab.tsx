"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LessonLogFormDialog,
  type LessonLogFormDialogSubject,
} from "@/components/lesson-log/lesson-log-form-dialog";

// FAB "Ajouter au cahier de texte" -- même pattern exact que
// components/homework/add-homework-fab.tsx.

export interface AddLessonLogFabProps {
  subjects: LessonLogFormDialogSubject[];
  defaultDateIso: string;
}

export function AddLessonLogFab({ subjects, defaultDateIso }: AddLessonLogFabProps) {
  return (
    <LessonLogFormDialog
      subjects={subjects}
      defaultDateIso={defaultDateIso}
      trigger={
        <Button
          type="button"
          aria-label="Ajouter au cahier de texte"
          className="fixed bottom-20 right-4 z-20 size-14 rounded-full shadow-lg"
        >
          <Plus aria-hidden="true" className="size-6" />
        </Button>
      }
    />
  );
}
