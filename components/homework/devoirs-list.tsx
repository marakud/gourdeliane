"use client";

import { Sparkles } from "lucide-react";
import type { ActionResult } from "@/actions/homework";
import { DevoirRow } from "@/components/homework/devoir-row";
import type {
  HomeworkFormDialogSlot,
  HomeworkFormDialogSubject,
} from "@/components/homework/homework-form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useDevoirActions } from "@/lib/use-devoir-actions";
import {
  computeEstimatedWorkload,
  formatEstimatedDuration,
  type DevoirStatus,
  type TaskViewCategory,
} from "@/domain/homework";
import type { ActiveHomeworkSession } from "@/domain/homework-timer";

// Bloc "Devoirs" (Accueil, Story 2.4 -- retour utilisateur : contrairement à
// la première itération, un devoir coché reste affiché (coché), jamais
// retiré de la liste. Bascule bidirectionnelle et suppression explicite.
// État/handlers extraits dans lib/use-devoir-actions.ts, rendu d'une ligne
// extrait dans components/homework/devoir-row.tsx (évolution CartableFlow,
// page "Mes tâches") -- partagés entre ce bloc et cette nouvelle page,
// jamais dupliqués.

export interface DevoirView {
  id: string;
  description: string;
  done: boolean;
  aRendre: boolean;
  status: DevoirStatus;
  estimatedMinutes: number | null;
  subject: { id: string; name: string; colorIndex: number };
  // Formatés côté serveur (app/(accueil)/page.tsx, AD-4) -- ce composant
  // n'a jamais à recalculer une date lui-même. Échéance (date de rendu
  // fixée par l'école) et planification (quand l'élève prévoit de le faire)
  // sont deux notions distinctes et indépendantes (évolution CartableFlow,
  // retour utilisateur), jamais fusionnées.
  echeanceLabel: string | null;
  echeanceDaysRemaining: number | null;
  // ISO "yyyy-MM-dd" brute (retour utilisateur -- édition), à côté
  // d'`echeanceLabel` déjà formatée pour l'affichage.
  echeanceIso: string | null;
  planLabel: string | null;
  planDaysRemaining: number | null;
  planDateIso: string | null;
  // Heure optionnelle accompagnant la planification -- "HH:mm", `null` si
  // aucune heure précise.
  planTime: string | null;
  // Classification pour la page "Mes tâches" (domain/homework.ts::classifyTaskView)
  // -- inutile pour ce bloc (Accueil ne filtre pas par vue), calculée quand
  // même par `toDevoirTaskView` en amont, sans coût à porter ici.
  taskView: TaskViewCategory;
  // Minuteur de devoirs (évolution CartableFlow, retour utilisateur) --
  // `activeSession` non nul = un chronomètre/minuteur tourne actuellement
  // sur ce devoir (affiché en direct sur la carte dédiée d'Accueil, jamais
  // recalculé ici). `totalRealSeconds` cumule les sessions déjà terminées.
  activeSession: ActiveHomeworkSession | null;
  totalRealSeconds: number;
}

export type ToggleDevoirDoneAction = (input: {
  id: string;
  done: boolean;
}) => Promise<ActionResult<null>>;

export type DeleteDevoirAction = (input: {
  id: string;
}) => Promise<ActionResult<null>>;

export type StartTimerAction = (input: {
  devoirId: string;
  mode: string;
  plannedMinutes?: number;
}) => Promise<ActionResult<{ started: boolean }>>;

export type StopTimerAction = (input: {
  devoirId: string;
}) => Promise<ActionResult<{ stopped: boolean }>>;

export interface DevoirsListProps {
  devoirs: DevoirView[];
  onToggle: ToggleDevoirDoneAction;
  onDelete: DeleteDevoirAction;
  onStartTimer: StartTimerAction;
  onStopTimer: StopTimerAction;
  // Nécessaires pour le formulaire d'édition (retour utilisateur) -- mêmes
  // données que celles déjà passées à AddHomeworkFab.
  subjects: HomeworkFormDialogSubject[];
  scheduleSlots?: HomeworkFormDialogSlot[];
}

export function DevoirsList({
  devoirs,
  onToggle,
  onDelete,
  onStartTimer,
  onStopTimer,
  subjects,
  scheduleSlots = [],
}: DevoirsListProps) {
  const { visibleDevoirs, pendingIds, errorIds, handleToggle, handleDelete, setPending } =
    useDevoirActions(devoirs, onToggle, onDelete);

  const doneCount = visibleDevoirs.filter((devoir) => devoir.done).length;
  const workload = computeEstimatedWorkload(visibleDevoirs);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Devoirs à faire
        </h3>
        {visibleDevoirs.length > 0 && (
          <span className="text-sm font-medium text-muted-foreground">
            {doneCount}/{visibleDevoirs.length}
          </span>
        )}
      </div>

      {/* Évolution CartableFlow -- jamais présentée comme une durée
          certaine ("environ"), et seulement si au moins un devoir restant a
          une estimation (sinon "environ 0 min" laisserait croire à tort
          qu'aucun devoir ne prend de temps). */}
      {workload.hasEstimate && (
        <p className="text-sm text-muted-foreground">
          Tu as environ {formatEstimatedDuration(workload.totalMinutes)} de
          travail restant.
        </p>
      )}

      {visibleDevoirs.length === 0 ? (
        // Refonte visuelle étape 6 -- `Sparkles`, même icône que
        // CelebrationBadge (celebration-badge.tsx) : ce message est un vrai
        // motif de satisfaction (EXPERIENCE.md), pas une simple absence de
        // contenu -- même vocabulaire visuel que les autres "bonnes
        // nouvelles" de l'app.
        <EmptyState
          icon={Sparkles}
          message="Rien à faire ce soir, bravo !"
          layout="inline"
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {visibleDevoirs.map((devoir) => (
            <DevoirRow
              key={devoir.id}
              devoir={devoir}
              pending={pendingIds.has(devoir.id)}
              hasError={errorIds.has(devoir.id)}
              onToggle={() => handleToggle(devoir.id)}
              onStartTimer={onStartTimer}
              onStopTimer={onStopTimer}
              onDelete={() => handleDelete(devoir.id)}
              onPendingChange={(pending) => setPending(devoir.id, pending)}
              subjects={subjects}
              scheduleSlots={scheduleSlots}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
