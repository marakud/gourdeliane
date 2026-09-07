"use client";

import { useState, useTransition } from "react";
import { CalendarOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { markNoSchoolDay, unmarkNoSchoolDay } from "@/actions/schedule";

export interface NoSchoolDayPanelProps {
  noSchoolDays: { date: string }[]; // ISO "yyyy-MM-dd", triées croissant
}

function formatFrenchDate(iso: string): string {
  // Construit la date à midi UTC pour éviter tout décalage de fuseau lors
  // de l'affichage (la date est un jour calendaire, pas un instant).
  const date = new Date(`${iso}T12:00:00Z`);
  const formatted = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  // Seule la première lettre se capitalise en français ("Lundi 6 septembre",
  // jamais "Lundi 6 Septembre") -- la classe Tailwind `capitalize` capitalise
  // chaque mot, ce qu'on évite en construisant la chaîne nous-mêmes ici.
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function NoSchoolDayPanel({ noSchoolDays }: NoSchoolDayPanelProps) {
  const [dateInput, setDateInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleMark() {
    if (!dateInput) return;
    setError(null);
    startTransition(async () => {
      const result = await markNoSchoolDay(dateInput);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDateInput("");
    });
  }

  function handleUnmark(iso: string) {
    setError(null);
    startTransition(async () => {
      const result = await unmarkNoSchoolDay(iso);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <section
      aria-labelledby="no-school-heading"
      className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
    >
      <div className="flex items-center gap-2">
        <CalendarOff aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 id="no-school-heading" className="font-heading text-lg font-semibold">
          Jours sans cours
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Marque une date précise (jour férié, vacances) -- indépendant des
        créneaux hebdomadaires.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-1 min-w-[160px] flex-col gap-1.5">
          <Label htmlFor="no-school-date">Date</Label>
          <Input
            id="no-school-date"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <Button
          type="button"
          onClick={handleMark}
          disabled={!dateInput || isPending}
          className="h-11 min-w-[44px]"
        >
          Marquer sans cours
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {noSchoolDays.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {noSchoolDays.map(({ date }) => (
            <li
              key={date}
              className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2"
            >
              <span className="text-base text-foreground">
                {formatFrenchDate(date)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Démarquer le ${formatFrenchDate(date)}`}
                disabled={isPending}
                onClick={() => handleUnmark(date)}
                className="size-11"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucun jour marqué « sans cours » pour l&apos;instant.
        </p>
      )}
    </section>
  );
}
