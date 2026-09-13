"use client";

import { useState, useTransition, type FormEvent, type ReactElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  createLessonLogAction,
  updateLessonLogAction,
  type LessonLogFormInput,
} from "@/actions/lesson-log";

// Formulaire d'une entrée de cahier de texte, factorisé pour être partagé
// entre la création (AddLessonLogFab) et l'édition (LessonLogEntry) -- même
// pattern exact que HomeworkFormDialog (components/homework/homework-form-dialog.tsx) :
// un seul composant, `entry` présent uniquement en mode édition.

export interface LessonLogFormDialogSubject {
  id: string;
  name: string;
  colorIndex: number;
}

export interface LessonLogFormDialogEntry {
  id: string;
  subjectId: string;
  date: string; // ISO "yyyy-MM-dd"
  content: string;
}

export interface LessonLogFormDialogProps {
  trigger: ReactElement;
  subjects: LessonLogFormDialogSubject[];
  // Présent uniquement en mode édition.
  entry?: LessonLogFormDialogEntry;
  // Date par défaut en création (retour utilisateur -- toujours aujourd'hui
  // au premier remplissage, mais librement modifiable pour rattraper un jour
  // oublié), ignorée en mode édition (l'entrée garde sa propre date).
  defaultDateIso: string;
  onPendingChange?: (pending: boolean) => void;
}

function toFormInput(
  entry: LessonLogFormDialogEntry | undefined,
  defaultSubjectId: string,
  defaultDateIso: string
): LessonLogFormInput {
  if (!entry) {
    return { subjectId: defaultSubjectId, date: defaultDateIso, content: "" };
  }
  return { subjectId: entry.subjectId, date: entry.date, content: entry.content };
}

export function LessonLogFormDialog({
  trigger,
  subjects,
  entry,
  defaultDateIso,
  onPendingChange,
}: LessonLogFormDialogProps) {
  const isEdit = Boolean(entry);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LessonLogFormInput>(
    toFormInput(entry, subjects[0]?.id ?? "", defaultDateIso)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetAndOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setError(null);
      setForm(toFormInput(entry, subjects[0]?.id ?? "", defaultDateIso));
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    onPendingChange?.(true);

    startTransition(async () => {
      const result = isEdit
        ? await updateLessonLogAction(entry!.id, form)
        : await createLessonLogAction(form);
      onPendingChange?.(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Ferme immédiatement, sans écran de confirmation (même convention que
      // HomeworkFormDialog, Boundaries spec 2.4).
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={resetAndOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l'entrée" : "Ajouter au cahier de texte"}
          </DialogTitle>
          <DialogDescription>
            Ce qui a été vu en cours, pour t&apos;y retrouver plus tard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-log-subject">Matière</Label>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ajoute d&apos;abord une matière depuis l&apos;emploi du temps.
              </p>
            ) : (
              <Select
                value={form.subjectId}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, subjectId: value as string }))
                }
              >
                <SelectTrigger id="lesson-log-subject" className="h-11 w-full text-base">
                  <SelectValue>
                    {(value: string | null) =>
                      subjects.find((subject) => subject.id === value)?.name ??
                      "Choisis une matière"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-log-date">Date du cours</Label>
            <Input
              id="lesson-log-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="h-11 text-base"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-log-content">Ce qui a été vu</Label>
            <Textarea
              id="lesson-log-content"
              required
              autoFocus
              placeholder="ex. Chapitre 3 : les fractions, exercices 12 à 15"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={4}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 min-w-[44px]"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending || subjects.length === 0}
              className="h-11 min-w-[44px]"
            >
              {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
