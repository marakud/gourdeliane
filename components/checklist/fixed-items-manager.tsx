"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createFixedChecklistItem,
  deleteFixedChecklistItem,
  updateFixedChecklistItem,
} from "@/actions/checklist";

// Réglages -- gestion de la liste "Ce matin" (Story 2.2). Liste plate (pas
// de groupement par matière, contrairement à SubjectItemsManager) : ajouter/
// modifier/supprimer un item s'applique immédiatement, sans jamais toucher
// aux `ChecklistItemState` déjà cochés (AD-3) -- domain/checklist.ts croise
// ça au moment de l'affichage du bloc "Ce matin" sur Accueil.

export interface FixedItemsManagerItem {
  id: string;
  label: string;
}

export interface FixedItemsManagerProps {
  title: string;
  items: FixedItemsManagerItem[];
}

export function FixedItemsManager({ title, items }: FixedItemsManagerProps) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {title}
      </h2>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <FixedItemRow key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucun item dans cette liste.
        </p>
      )}

      <AddFixedItemForm />
    </section>
  );
}

function FixedItemRow({ item }: { item: FixedItemsManagerItem }) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const trimmed = label.trim();
    if (trimmed.length === 0) {
      setError("Le nom de l'item est requis.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateFixedChecklistItem(item.id, trimmed);
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
      const result = await deleteFixedChecklistItem(item.id);
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
            aria-label="Nom de l'item"
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

function AddFixedItemForm() {
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
      const result = await createFixedChecklistItem({ label: trimmed });
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
          placeholder="ex. Casquette"
          className="h-11 flex-1 text-base"
          aria-label="Nouvel item"
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
