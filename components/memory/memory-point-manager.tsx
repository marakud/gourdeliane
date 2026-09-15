"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Brain, CheckCircle2, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  createMemoryPointAction,
  deleteMemoryPointAction,
  markMemoryPointReviewedAction,
  setMemoryPointStatusAction,
  type MemoryPointFormInput,
} from "@/actions/memory-point";
import {
  MEMORY_STATUS_ACQUIRED,
  MEMORY_STATUS_LABELS,
  MEMORY_STATUS_LEARNING,
  MEMORY_STATUS_TO_REVIEW,
  type MemoryPointView,
  type MemoryStatus,
} from "@/domain/memory-point";
import { SubjectTag } from "@/components/schedule/subject-tag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SubjectOption { id: string; name: string; colorIndex: number }

export function MemoryPointManager({
  points,
  subjects,
}: {
  points: MemoryPointView[];
  subjects: SubjectOption[];
}) {
  const [form, setForm] = useState<MemoryPointFormInput>({
    subjectId: subjects[0]?.id ?? "",
    content: "",
    note: "",
  });
  const [filter, setFilter] = useState<MemoryStatus | "ACTIVE">("ACTIVE");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(
    () => points.filter((point) =>
      filter === "ACTIVE" ? point.status !== MEMORY_STATUS_ACQUIRED : point.status === filter
    ),
    [points, filter]
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createMemoryPointAction(form);
      if (!result.ok) return setError(result.error);
      setForm((current) => ({ ...current, content: "", note: "" }));
    });
  }

  function run(id: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setPendingId(id);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Impossible d'enregistrer.");
      setPendingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Ajouter un point à mémoriser</h2>
          <p className="text-sm text-muted-foreground">Une erreur, une règle ou une notion à revoir avec Hugo.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="memory-subject">Matière</Label>
          <Select value={form.subjectId} onValueChange={(value) => setForm((f) => ({ ...f, subjectId: value as string }))}>
            <SelectTrigger id="memory-subject" className="h-11 w-full text-base">
              <SelectValue>{(value: string | null) => subjects.find((s) => s.id === value)?.name ?? "Choisis une matière"}</SelectValue>
            </SelectTrigger>
            <SelectContent>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="memory-content">Point à retravailler</Label>
          <Input id="memory-content" required value={form.content} onChange={(event) => setForm((f) => ({ ...f, content: event.target.value }))} placeholder="ex. Ne pas oublier le -s à la 3e personne" className="h-11 text-base" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="memory-note">Contexte ou exemple (facultatif)</Label>
          <Textarea id="memory-note" value={form.note} onChange={(event) => setForm((f) => ({ ...f, note: event.target.value }))} placeholder="Exercice, erreur observée ou méthode à utiliser…" rows={3} />
        </div>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={isPending || subjects.length === 0} className="h-11 self-end px-4">
          <Plus aria-hidden="true" /> Ajouter
        </Button>
      </form>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Points enregistrés</h2>
            <p className="text-sm text-muted-foreground">{visible.length} point{visible.length > 1 ? "s" : ""} affiché{visible.length > 1 ? "s" : ""}</p>
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as MemoryStatus | "ACTIVE")}>
            <SelectTrigger aria-label="Filtrer les points" className="h-11 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">À travailler</SelectItem>
              <SelectItem value={MEMORY_STATUS_TO_REVIEW}>À revoir</SelectItem>
              <SelectItem value={MEMORY_STATUS_LEARNING}>En cours</SelectItem>
              <SelectItem value={MEMORY_STATUS_ACQUIRED}>Acquis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {visible.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-card p-4 text-muted-foreground ring-1 ring-border">
            <Brain aria-hidden="true" className="size-6" /> Aucun point dans cette vue.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((point) => (
              <li key={point.id} className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
                <div className="flex items-start gap-3">
                  <SubjectTag name={point.subject.name} colorIndex={point.subject.colorIndex} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-foreground">{point.content}</p>
                    {point.note && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{point.note}</p>}
                  </div>
                  <button type="button" aria-label={`Supprimer ${point.content}`} disabled={pendingId === point.id} onClick={() => run(point.id, () => deleteMemoryPointAction(point.id))} className="flex size-11 items-center justify-center rounded-xl text-destructive disabled:opacity-50">
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="rounded-full bg-muted px-2.5 py-1 font-medium">{MEMORY_STATUS_LABELS[point.status]}</span>
                  <span>{point.reviewCount} révision{point.reviewCount > 1 ? "s" : ""}</span>
                  {point.lastReviewedLabel && <span>Dernière : {point.lastReviewedLabel}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="h-11" disabled={pendingId === point.id} onClick={() => run(point.id, () => markMemoryPointReviewedAction(point.id))}>
                    <RefreshCw aria-hidden="true" /> Revu aujourd&apos;hui
                  </Button>
                  {point.status !== MEMORY_STATUS_ACQUIRED ? (
                    <Button type="button" variant="secondary" className="h-11" disabled={pendingId === point.id} onClick={() => run(point.id, () => setMemoryPointStatusAction(point.id, MEMORY_STATUS_ACQUIRED))}>
                      <CheckCircle2 aria-hidden="true" /> Marquer acquis
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" className="h-11" disabled={pendingId === point.id} onClick={() => run(point.id, () => setMemoryPointStatusAction(point.id, MEMORY_STATUS_TO_REVIEW))}>Remettre à revoir</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
