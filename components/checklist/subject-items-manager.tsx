"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubjectTag } from "@/components/schedule/subject-tag";
import {
  createSubjectItem,
  deleteSubjectItem,
  updateSubjectItem,
} from "@/actions/checklist";

// Réglages -- gestion des objets par défaut de chaque matière (FR-4, Story
// 2.1). Une modification ici s'applique à toutes les occurrences futures de
// la matière concernée : ce composant ne connaît aucune date, aucun état
// coché -- seul domain/checklist.ts croise ça avec l'EDT au moment de
// l'affichage du sac sur Accueil.

export interface SubjectItemsManagerItem {
  id: string;
  label: string;
}

export interface SubjectItemsManagerSubject {
  id: string;
  name: string;
  colorIndex: number;
  items: SubjectItemsManagerItem[];
}

export interface SubjectItemsManagerProps {
  subjects: SubjectItemsManagerSubject[];
}

export function SubjectItemsManager({ subjects }: SubjectItemsManagerProps) {
  if (subjects.length === 0) {
    return (
      <p className="rounded-2xl bg-card px-4 py-8 text-center text-base text-muted-foreground ring-1 ring-border">
        Ajoute d&apos;abord une matière depuis l&apos;emploi du temps pour
        pouvoir lui définir des objets.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {subjects.map((subject) => (
        <li
          key={subject.id}
          className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
        >
          <div className="flex items-center gap-2">
            <SubjectTag name={subject.name} colorIndex={subject.colorIndex} />
            <h2 className="font-heading text-lg font-semibold text-foreground">
              {subject.name}
            </h2>
          </div>

          {subject.items.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {subject.items.map((item) => (
                <SubjectItemRow key={item.id} item={item} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun objet défini pour cette matière.
            </p>
          )}

          <AddSubjectItemForm subjectId={subject.id} />
        </li>
      ))}
    </ul>
  );
}

function SubjectItemRow({ item }: { item: SubjectItemsManagerItem }) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const trimmed = label.trim();
    if (trimmed.length === 0) {
      setError("Le nom de l'objet est requis.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateSubjectItem(item.id, trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
    });
  }

  function handleCancel() {
    setLabel(item.label);
    setError(null);
    setIsEditing(false);
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteSubjectItem(item.id);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  if (isEditing) {
    return (
      <li className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-11 flex-1 text-base"
            aria-label="Nom de l'objet"
          />
          <Button
            type="button"
            size="icon"
            className="size-11"
            disabled={isPending}
            onClick={handleSave}
            aria-label="Enregistrer"
          >
            <Check aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            disabled={isPending}
            onClick={handleCancel}
            aria-label="Annuler"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
        <span className="text-base text-foreground">{item.label}</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            onClick={() => setIsEditing(true)}
            aria-label={`Modifier ${item.label}`}
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            disabled={isPending}
            onClick={handleDelete}
            aria-label={`Supprimer ${item.label}`}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

function AddSubjectItemForm({ subjectId }: { subjectId: string }) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = label.trim();
    if (trimmed.length === 0) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createSubjectItem({ subjectId, label: trimmed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLabel("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="ex. Tenue de sport"
          className="h-11 flex-1 text-base"
          aria-label="Nouvel objet"
        />
        <Button
          type="submit"
          disabled={isPending || label.trim().length === 0}
          className="h-11 min-w-[44px]"
        >
          <Plus aria-hidden="true" className="size-4" />
          Ajouter
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
