"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/actions/settings";

export interface FirstNameCardProps {
  firstName: string | null;
  onSetFirstName: (firstName: string) => Promise<ActionResult<null>>;
}

// Longueur maximale raisonnable pour un prénom (composé inclus), affiché
// ensuite dans un <h1> sans troncature -- correctif de revue (aucune limite
// avant, un texte arbitrairement long pouvait casser visuellement l'accueil).
const MAX_FIRST_NAME_LENGTH = 60;

export function FirstNameCard({ firstName, onSetFirstName }: FirstNameCardProps) {
  const [value, setValue] = useState(firstName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  // Resynchronise depuis la prop serveur (ex. après le succès de cette même
  // sauvegarde, une fois `revalidatePath` repassé par ici avec la valeur
  // *triée* réellement persistée) -- ajustement pendant le rendu plutôt qu'un
  // `useEffect`, même pattern que components/homework/devoirs-list.tsx.
  const [prevFirstName, setPrevFirstName] = useState(firstName);
  if (firstName !== prevFirstName) {
    setPrevFirstName(firstName);
    setValue(firstName ?? "");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isPending) return;
    setError(null);

    startTransition(async () => {
      const result = await onSetFirstName(value);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Prénom
        </h2>
        <p className="text-sm text-muted-foreground">
          Utilisé pour le message d&apos;accueil (&quot;Bonjour ... !&quot;).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <Label htmlFor={inputId} className="sr-only">
          Prénom
        </Label>
        <Input
          id={inputId}
          placeholder="ex. Léa"
          value={value}
          maxLength={MAX_FIRST_NAME_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          className="h-11 flex-1 text-base"
        />
        <Button type="submit" disabled={isPending} className="h-11 min-w-[44px]">
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
