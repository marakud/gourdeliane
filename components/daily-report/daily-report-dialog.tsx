"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ClipboardPlus } from "lucide-react";
import { createDailyReportAction } from "@/actions/daily-report";
import type { DailyReportFormInput } from "@/domain/daily-report";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SubjectOption {
  id: string;
  name: string;
}

export function DailyReportDialog({
  subjects,
  defaultDateIso,
}: {
  subjects: SubjectOption[];
  defaultDateIso: string;
}) {
  const initialForm = (): DailyReportFormInput => ({
    subjectId: subjects[0]?.id ?? "",
    date: defaultDateIso,
    lessonContent: "",
    homeworkDescription: "",
    homeworkPlanDate: "",
    homeworkDueDate: "",
    memoryContent: "",
    memoryNote: "",
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DailyReportFormInput>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function change<K extends keyof DailyReportFormInput>(
    key: K,
    value: DailyReportFormInput[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setForm(initialForm());
      setError(null);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDailyReportAction(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" className="h-12 w-full justify-start px-4 text-base">
            <ClipboardPlus aria-hidden="true" className="size-5" />
            Ajouter le bilan du jour
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bilan du jour</DialogTitle>
          <DialogDescription>
            Une seule saisie pour le cahier, les devoirs et les points à mémoriser.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="daily-report-subject">Matière</Label>
              <Select value={form.subjectId} onValueChange={(value) => change("subjectId", value as string)}>
                <SelectTrigger id="daily-report-subject" className="h-11 w-full text-base">
                  <SelectValue>
                    {(value: string | null) =>
                      subjects.find((subject) => subject.id === value)?.name ?? "Choisis une matière"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="daily-report-date">Date du cours</Label>
              <Input id="daily-report-date" type="date" required value={form.date} onChange={(event) => change("date", event.target.value)} className="h-11" />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2 rounded-xl border border-border p-3">
            <legend className="px-1 font-heading text-base font-semibold">Ce qui a été vu en cours</legend>
            <Label htmlFor="daily-report-lesson" className="sr-only">Contenu du cours</Label>
            <Textarea id="daily-report-lesson" placeholder="Ex. Fractions : addition avec le même dénominateur" value={form.lessonContent} onChange={(event) => change("lessonContent", event.target.value)} rows={3} />
          </fieldset>

          <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-3">
            <legend className="px-1 font-heading text-base font-semibold">Devoir donné</legend>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="daily-report-homework">Description</Label>
              <Input id="daily-report-homework" placeholder="Ex. Exercices 4 à 8 page 52" value={form.homeworkDescription} onChange={(event) => change("homeworkDescription", event.target.value)} className="h-11" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="daily-report-plan-date">À faire le</Label>
                <Input id="daily-report-plan-date" type="date" value={form.homeworkPlanDate} onChange={(event) => change("homeworkPlanDate", event.target.value)} className="h-11" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="daily-report-due-date">À rendre le</Label>
                <Input id="daily-report-due-date" type="date" value={form.homeworkDueDate} onChange={(event) => change("homeworkDueDate", event.target.value)} className="h-11" />
              </div>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-3">
            <legend className="px-1 font-heading text-base font-semibold">Point Mémoire</legend>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="daily-report-memory">Erreur ou notion à revoir</Label>
              <Input id="daily-report-memory" placeholder="Ex. Confond encore their et there" value={form.memoryContent} onChange={(event) => change("memoryContent", event.target.value)} className="h-11" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="daily-report-memory-note">Note complémentaire</Label>
              <Textarea id="daily-report-memory-note" placeholder="Exemple, correction ou méthode à retenir" value={form.memoryNote} onChange={(event) => change("memoryNote", event.target.value)} rows={2} />
            </div>
          </fieldset>

          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" className="h-11" disabled={isPending || subjects.length === 0}>
              {isPending ? "Enregistrement..." : "Enregistrer le bilan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
