"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { WeekParity } from "@/domain/schedule";
import type { ActionResult } from "@/actions/settings";

export interface WeekParityCardProps {
  currentParity: WeekParity | null;
  onSetParity: (parity: string) => Promise<ActionResult<null>>;
}

export function WeekParityCard({ currentParity, onSetParity }: WeekParityCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSet(parity: WeekParity) {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await onSetParity(parity);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Semaine A / B
        </h2>
        <p className="text-sm text-muted-foreground">
          {currentParity
            ? `Cette semaine est la semaine ${currentParity}.`
            : 'Aucune référence configurée -- un créneau "semaine A" ou "semaine B" ne peut pas encore être créé.'}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={currentParity === "A" ? "default" : "outline"}
          aria-pressed={currentParity === "A"}
          disabled={isPending}
          onClick={() => handleSet("A")}
          className="h-11 flex-1"
        >
          Cette semaine = Semaine A
        </Button>
        <Button
          type="button"
          variant={currentParity === "B" ? "default" : "outline"}
          aria-pressed={currentParity === "B"}
          disabled={isPending}
          onClick={() => handleSet("B")}
          className="h-11 flex-1"
        >
          Cette semaine = Semaine B
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
