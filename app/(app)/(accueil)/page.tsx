import { Sofa } from "lucide-react";
import { connection } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { getScheduleForUser } from "@/data/schedule";
import {
  listChecklistItemStates,
  listFixedChecklistItems,
  listSubjectItemsForSubjects,
} from "@/data/checklist";
import { listDevoirs } from "@/data/homework";
import {
  computeWeekParity,
  dedupeSubjectsFromSlots,
  deriveDaySlots,
  WEEKDAY_LABELS,
  type WeekParity,
  type Weekday,
} from "@/domain/schedule";
import {
  getCurrentMoment,
  getTodaySchoolDate,
  getTomorrowSchoolDate,
  schoolDateToIso,
  schoolDateToWeekday,
  SCHOOL_TIME_ZONE,
} from "@/domain/school-day";
import {
  CHECKLIST_TYPE_MATIN,
  CHECKLIST_TYPE_RETOUR,
  CHECKLIST_TYPE_REVISIONS,
  CHECKLIST_TYPE_SAC,
  DEFAULT_MATIN_ITEMS,
  DEFAULT_RETOUR_ITEMS,
  deriveFixedChecklist,
  deriveRevisionsChecklist,
  deriveSacChecklist,
  partitionDevoirsARendreForSac,
  type ChecklistSubjectGroupInput,
} from "@/domain/checklist";
import { computeDaysRemaining } from "@/domain/homework";
import {
  computeSoirCompletion,
  countBlockProgress,
  countSoirProgress,
  selectCurrentMomentProgress,
} from "@/domain/day-completion";
import {
  toggleMatinChecklistItem,
  toggleRetourChecklistItem,
  toggleRevisionsChecklistItem,
} from "@/actions/checklist";
import {
  deleteDevoirAction,
  startDevoirAction,
  toggleDevoirDoneAction,
} from "@/actions/homework";
import type { DevoirStatus } from "@/domain/homework";
import { SacChecklist } from "@/components/checklist/sac-checklist";
import { FixedChecklist } from "@/components/checklist/fixed-checklist";
import { RevisionsChecklist } from "@/components/checklist/revisions-checklist";
import { DevoirsList } from "@/components/homework/devoirs-list";
import { AddHomeworkFab } from "@/components/homework/add-homework-fab";
import { GreetingCard } from "@/components/moment/greeting-card";
import { MomentSoirCard } from "@/components/moment/moment-soir-card";
import { MomentTabs } from "@/components/moment/moment-tabs";
import { EmptyState } from "@/components/ui/empty-state";

// Même technique que `formatFrenchDate`
// (components/schedule/no-school-day-panel.tsx) : ancrage midi UTC pour
// éviter tout décalage de fuseau à l'affichage, et capitalisation manuelle de
// la seule première lettre (jamais la classe Tailwind `capitalize`, qui
// capitaliserait chaque mot -- bug corrigé en Story 1.3).
function formatEcheanceLabel(echeanceIso: string): string {
  const date = new Date(`${echeanceIso}T12:00:00Z`);
  const formatted = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Date + heure du message d'accueil, en America/Guadeloupe fixe (AD-4) --
 * `now` est reçu en paramètre explicite (jamais lu en interne), même
 * convention que domain/school-day.ts.
 */
function formatGreetingDateTime(now: Date): { dateLabel: string; timeLabel: string } {
  const dateLabel = now.toLocaleDateString("fr-FR", {
    timeZone: SCHOOL_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLabel = now.toLocaleTimeString("fr-FR", {
    timeZone: SCHOOL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
  return { dateLabel, timeLabel };
}

export default async function AccueilPage() {
  // Force le rendu dynamique à chaque requête (AGENTS.md -- modèle de cache
  // "component-level" de cette version de Next.js) : "demain" (AD-4) et la
  // requête Prisma ne sont pas des Request-time APIs qui déclencheraient ça
  // d'elles-mêmes, cf. app/edt/page.tsx (Story 1.3).
  await connection();

  const user = await requireCurrentUser();
  const { subjects, scheduleSlots, noSchoolDays } = await getScheduleForUser(
    user.id
  );

  const slots = scheduleSlots.map((slot) => ({
    id: slot.id,
    weekday: slot.weekday as Weekday,
    startTime: slot.startTime,
    endTime: slot.endTime,
    weekParity: slot.weekParity as WeekParity | null,
    subject: { name: slot.subject.name, colorIndex: slot.subject.colorIndex },
  }));

  const noSchoolDayIsoSet = new Set(
    noSchoolDays.map((day) => day.date.toISOString().slice(0, 10))
  );

  // "Demain" : calcul serveur en America/Guadeloupe fixe (AD-4), réutilisé tel
  // quel depuis domain/school-day.ts (Story 1.3) -- jamais recalculé
  // différemment ici (Boundaries de la spec 2.1).
  const now = new Date();
  const tomorrowDate = getTomorrowSchoolDate(now);
  const tomorrowIso = schoolDateToIso(tomorrowDate);
  const tomorrowWeekday = schoolDateToWeekday(tomorrowDate);

  // Semaine A/B (Story 1.4) : parité de "demain" précisément, cf.
  // app/edt/page.tsx pour le même calcul appliqué à "aujourd'hui".
  const weekAReferenceMondayIso = user.weekAReferenceMonday
    ? user.weekAReferenceMonday.toISOString().slice(0, 10)
    : null;
  const tomorrowParity = weekAReferenceMondayIso
    ? computeWeekParity(tomorrowIso, weekAReferenceMondayIso)
    : null;

  const tomorrowSlots = deriveDaySlots(
    slots,
    tomorrowWeekday,
    tomorrowIso,
    noSchoolDayIsoSet,
    tomorrowParity
  );

  // Matières ayant cours demain, dédupliquées (une matière peut avoir
  // plusieurs créneaux le même jour) en gardant l'ordre du premier créneau
  // de la journée -- puis résolues vers l'enregistrement `Subject` complet
  // (id inclus) pour pouvoir charger ses `SubjectItem` (domain/schedule.ts,
  // testé indépendamment de cette page).
  const tomorrowSubjects = dedupeSubjectsFromSlots(tomorrowSlots, subjects);

  // Chargé ici (avant la construction des groupes du Sac, Story 2.5) car un
  // devoir "à rendre" échéant demain doit pouvoir s'insérer dans le groupe
  // de sa matière -- seuls les champs bruts (subjectId, aRendre, echeance)
  // sont nécessaires à ce stade ; le formatage pour "Devoirs"
  // (echeanceLabel/daysRemaining, qui a besoin de `todayIso`) est fait plus
  // bas, à partir de ce même tableau (pas de second aller-retour DB).
  const devoirs = await listDevoirs(user.id);

  // Story 2.5 (FR-18) -- routage pur et testé (domain/checklist.ts), un seul
  // passage plutôt que deux boucles séparées couplées par un commentaire :
  // `itemsBySubjectId` (objets à injecter dans le Sac) et `consumedIds`
  // (exclus de "Devoirs pour demain" plus bas) proviennent de la même
  // décision, jamais désynchronisables.
  const { itemsBySubjectId: devoirARendreItemsBySubjectId, consumedIds: devoirsARendreConsumedIds } =
    partitionDevoirsARendreForSac(
      devoirs.map((devoir) => ({
        id: devoir.id,
        subjectId: devoir.subjectId,
        description: devoir.description,
        aRendre: devoir.aRendre,
        echeanceIso: devoir.echeance
          ? devoir.echeance.toISOString().slice(0, 10)
          : null,
      })),
      tomorrowIso,
      new Set(tomorrowSubjects.map((subject) => subject.id))
    );

  let sacGroups: ReturnType<typeof deriveSacChecklist> = [];
  if (tomorrowSubjects.length > 0) {
    const subjectIds = tomorrowSubjects.map((subject) => subject.id);
    const tomorrowDateAsDate = new Date(`${tomorrowIso}T00:00:00.000Z`);

    const [subjectItems, checkedStates] = await Promise.all([
      listSubjectItemsForSubjects(user.id, subjectIds),
      listChecklistItemStates(user.id, tomorrowDateAsDate, CHECKLIST_TYPE_SAC),
    ]);

    const itemsBySubjectId = new Map<string, { id: string; label: string }[]>();
    for (const item of subjectItems) {
      const list = itemsBySubjectId.get(item.subjectId) ?? [];
      list.push({ id: item.id, label: item.label });
      itemsBySubjectId.set(item.subjectId, list);
    }

    const checklistGroups: ChecklistSubjectGroupInput[] = tomorrowSubjects.map(
      (subject) => ({
        subject: {
          id: subject.id,
          name: subject.name,
          colorIndex: subject.colorIndex,
        },
        items: [
          ...(itemsBySubjectId.get(subject.id) ?? []),
          ...(devoirARendreItemsBySubjectId.get(subject.id) ?? []),
        ],
      })
    );

    sacGroups = deriveSacChecklist(
      checklistGroups,
      checkedStates.map((state) => ({
        sourceType: state.sourceType,
        sourceId: state.sourceId,
        checked: state.checked,
      }))
    );
  }

  // "Ce matin" (Story 2.2) : porte sur AUJOURD'HUI, pas demain (Boundaries
  // spec 2.2) -- indépendant de l'EDT, toujours affiché. Le pré-remplissage
  // des défauts à la première consultation est géré par
  // data/checklist.ts::listFixedChecklistItems.
  const todayDate = getTodaySchoolDate(now);
  const todayIso = schoolDateToIso(todayDate);
  const todayDateAsDate = new Date(`${todayIso}T00:00:00.000Z`);
  const todayWeekday = schoolDateToWeekday(todayDate);

  // "Révisions du jour" (Story 2.6, FR-19) : porte sur AUJOURD'HUI, calculé
  // indépendamment du bloc Sac (qui regarde demain) -- même mécanisme exact
  // que `tomorrowSlots`/`tomorrowSubjects` plus haut, appliqué à aujourd'hui.
  const todayParity = weekAReferenceMondayIso
    ? computeWeekParity(todayIso, weekAReferenceMondayIso)
    : null;
  const todaySlots = deriveDaySlots(
    slots,
    todayWeekday,
    todayIso,
    noSchoolDayIsoSet,
    todayParity
  );
  const todaySubjects = dedupeSubjectsFromSlots(todaySlots, subjects);

  // "Retour" (Story 2.3) : même mécanisme exact que "Ce matin" ci-dessus --
  // porte sur AUJOURD'HUI (AD-4), indépendant de l'EDT, toujours affiché.
  // Types distincts (`CHECKLIST_TYPE_RETOUR` vs `CHECKLIST_TYPE_MATIN`) :
  // cocher un item de l'un n'affecte jamais l'état de l'autre (I/O matrix
  // spec 2.3). Les 4 requêtes Matin+Retour sont batchées dans un seul
  // Promise.all (indépendantes entre elles) plutôt que deux Promise.all
  // séquentiels, pour ne pas payer un aller-retour DB supplémentaire.
  const [
    matinItems,
    matinCheckedStates,
    retourItems,
    retourCheckedStates,
    revisionsCheckedStates,
  ] = await Promise.all([
    listFixedChecklistItems(user.id, CHECKLIST_TYPE_MATIN, DEFAULT_MATIN_ITEMS),
    listChecklistItemStates(user.id, todayDateAsDate, CHECKLIST_TYPE_MATIN),
    listFixedChecklistItems(user.id, CHECKLIST_TYPE_RETOUR, DEFAULT_RETOUR_ITEMS),
    listChecklistItemStates(user.id, todayDateAsDate, CHECKLIST_TYPE_RETOUR),
    // Optimisation : évite une requête inutile un jour sans cours (pas
    // exigé par le Boundaries de la spec 2.6, qui ne dit rien sur ce point).
    // Type explicite pour que la branche vide reste alignée avec le type de
    // retour réel de `listChecklistItemStates`, plutôt qu'un `Promise<never[]>`
    // inféré coïncidant seulement par structure.
    todaySubjects.length > 0
      ? listChecklistItemStates(user.id, todayDateAsDate, CHECKLIST_TYPE_REVISIONS)
      : Promise.resolve<Awaited<ReturnType<typeof listChecklistItemStates>>>([]),
  ]);

  const matinChecklist = deriveFixedChecklist(
    matinItems.map((item) => ({ id: item.id, label: item.label })),
    matinCheckedStates.map((state) => ({
      sourceType: state.sourceType,
      sourceId: state.sourceId,
      checked: state.checked,
    }))
  );

  const retourChecklist = deriveFixedChecklist(
    retourItems.map((item) => ({ id: item.id, label: item.label })),
    retourCheckedStates.map((state) => ({
      sourceType: state.sourceType,
      sourceId: state.sourceId,
      checked: state.checked,
    }))
  );

  // Progression Matin/Retour (refonte visuelle, carte d'accueil) -- réutilise
  // les mêmes checklists que celles affichées dans les onglets, jamais un
  // second calcul divergent.
  const matinProgress = countBlockProgress(matinChecklist);
  const retourProgress = countBlockProgress(retourChecklist);

  const revisionsChecklist = deriveRevisionsChecklist(
    todaySubjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      colorIndex: subject.colorIndex,
    })),
    revisionsCheckedStates.map((state) => ({
      sourceType: state.sourceType,
      sourceId: state.sourceId,
      checked: state.checked,
    }))
  );

  // "Devoirs" (Story 2.4, retour utilisateur) : bloc indépendant de l'EDT,
  // toujours affiché (y compris vide -- contrairement au sac). `listDevoirs`
  // renvoie faits + à faire -- un devoir fait reste affiché (coché), plus
  // jamais retiré de la liste par un filtre (Boundaries spec 2.4 amendée).
  // Échéance/jours-restants formatés ici, côté serveur (AD-4) -- jamais
  // recalculés côté client. `devoirs` déjà chargé plus haut (Story 2.5).
  const devoirsView = devoirs.map((devoir) => {
    const echeanceIso = devoir.echeance
      ? devoir.echeance.toISOString().slice(0, 10)
      : null;
    return {
      id: devoir.id,
      description: devoir.description,
      done: devoir.done,
      aRendre: devoir.aRendre,
      status: devoir.status as DevoirStatus,
      estimatedMinutes: devoir.estimatedMinutes,
      subject: {
        id: devoir.subject.id,
        name: devoir.subject.name,
        colorIndex: devoir.subject.colorIndex,
      },
      echeanceLabel: echeanceIso ? formatEcheanceLabel(echeanceIso) : null,
      daysRemaining: echeanceIso
        ? computeDaysRemaining(echeanceIso, todayIso)
        : null,
      echeanceIso,
      planned:
        devoir.plannedWeekday && devoir.plannedStartTime
          ? {
              weekday: WEEKDAY_LABELS[devoir.plannedWeekday as Weekday],
              startTime: devoir.plannedStartTime,
            }
          : null,
      plannedRaw:
        devoir.plannedWeekday && devoir.plannedStartTime
          ? { weekday: devoir.plannedWeekday, startTime: devoir.plannedStartTime }
          : null,
    };
  });

  const homeworkSubjects = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    colorIndex: subject.colorIndex,
  }));

  // "Devoirs pour demain" (retour utilisateur) -- devoirs dont l'échéance
  // tombe précisément demain, à côté du sac (bloc "Avant d'aller se
  // coucher"). Purement informatif ici : cocher/éditer/supprimer reste
  // réservé au bloc "Devoirs" plus bas (pas de double UI de mutation). Un
  // devoir déjà fait est exclu (correctif de revue) : cette rubrique répond
  // à "qu'est-ce qu'il me reste à préparer/faire ce soir ?", pas un
  // historique -- sans ce filtre, un devoir fini restait affiché et pouvait
  // même déclencher l'affichage de la carte un soir sans cours ni rien à
  // faire (le message "Pas cours demain, profite de ta soirée !" ne
  // s'affichait plus alors qu'il n'y avait plus rien à préparer). Un devoir
  // "à rendre" déjà basculé vers un objet cochable du Sac est également
  // exclu (Story 2.5, pas de doublon) -- sauf s'il n'a pas pu s'y insérer
  // (sa matière n'a pas cours demain), auquel cas il reste ici.
  const devoirsForTomorrow = devoirsView.filter(
    (devoir) =>
      devoir.echeanceIso === tomorrowIso &&
      !devoir.done &&
      !devoirsARendreConsumedIds.has(devoir.id)
  );

  // Complétude du moment "Ce soir" (Story 2.7, FR-20, AD-5) : calculée ici à
  // partir des données déjà chargées (sacGroups/revisionsChecklist/devoirs),
  // aucun aller-retour DB supplémentaire pour l'affichage -- même fonction
  // pure que data/day-completion.ts::recomputeAndPersistSoirCompletion
  // (appelée par les actions après chaque coche), jamais un second calcul
  // divergent. `devoirsARendreDemain` reprend TOUS les devoirs "à rendre"
  // échéant demain (fait ou non, injecté dans le Sac ou non) -- contrairement
  // à `devoirsForTomorrow` ci-dessus (purement informatif, exclut déjà les
  // faits et les injectés) : la complétude a besoin de l'état réel de chacun.
  const devoirsARendreDemain = devoirsView
    .filter((devoir) => devoir.aRendre && devoir.echeanceIso === tomorrowIso)
    .map((devoir) => ({ done: devoir.done }));
  const soirComplete = computeSoirCompletion({
    sacGroups,
    revisionsItems: revisionsChecklist,
    devoirsARendreDemain,
  });
  // Même agrégation que `soirComplete` juste au-dessus, en décompte
  // fait/total plutôt qu'en booléen (refonte visuelle, carte d'accueil).
  const soirProgress = countSoirProgress({
    sacGroups,
    revisionsItems: revisionsChecklist,
    devoirsARendreDemain,
  });

  const { dateLabel, timeLabel } = formatGreetingDateTime(now);

  // Retour utilisateur -- Accueil affiche désormais UN SEUL moment par
  // défaut (fidèle à l'intention UX d'origine, EXPERIENCE.md), calculé côté
  // serveur en America/Guadeloupe fixe (AD-4), jamais depuis l'heure locale
  // du client. Les deux autres restent accessibles via `MomentTabs`
  // (bascule 100% client, aucun rechargement).
  const currentMoment = getCurrentMoment(now);

  // Repli visuel (Story 3.2, FR-11) porté désormais par la carte d'accueil
  // elle-même ("missions restantes" + jauge, toujours visible, recalculée en
  // direct à chaque rendu -- jamais depuis un accusé de réception push) --
  // l'ancienne bannière séparée faisait doublon et a été retirée (refonte
  // visuelle, étape 2). Sélection extraite en fonction pure testée
  // (`selectCurrentMomentProgress`, domain/day-completion.ts) plutôt qu'un
  // ternaire inline, même principe que le correctif de revue Story 3.2.
  const currentMomentProgress = selectCurrentMomentProgress(
    currentMoment,
    matinProgress,
    retourProgress,
    soirProgress
  );

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-8">
      <GreetingCard
        firstName={user.firstName}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        currentMoment={currentMoment}
        progress={currentMomentProgress}
      />

      <MomentTabs
        initialActive={currentMoment}
        matin={
          <FixedChecklist
            title="Ce matin"
            items={matinChecklist}
            dateIso={todayIso}
            headingId="matin-heading"
            onToggle={toggleMatinChecklistItem}
            hideTitle
          />
        }
        retour={
          <FixedChecklist
            title="Retour"
            items={retourChecklist}
            dateIso={todayIso}
            headingId="retour-heading"
            onToggle={toggleRetourChecklistItem}
            hideTitle
          />
        }
        soir={
          <MomentSoirCard complete={soirComplete}>
            {revisionsChecklist.length > 0 && (
              <RevisionsChecklist
                items={revisionsChecklist}
                dateIso={todayIso}
                onToggle={toggleRevisionsChecklistItem}
              />
            )}

            <div
              className={
                revisionsChecklist.length > 0
                  ? "flex flex-col gap-4 border-t border-border pt-4"
                  : "flex flex-col gap-4"
              }
            >
              <DevoirsList
                devoirs={devoirsView}
                onToggle={toggleDevoirDoneAction}
                onDelete={deleteDevoirAction}
                onStart={startDevoirAction}
                subjects={homeworkSubjects}
                scheduleSlots={slots}
              />
            </div>

            <div className="flex flex-col gap-4 border-t border-border pt-4">
              {sacGroups.length > 0 || devoirsForTomorrow.length > 0 ? (
                <SacChecklist
                  groups={sacGroups}
                  devoirsForTomorrow={devoirsForTomorrow}
                  dateIso={tomorrowIso}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    Avant d&apos;aller se coucher
                  </h3>
                  {/* Refonte visuelle étape 6 -- même icône/famille que
                      DayView (Sofa, "rien de prévu, profite") : même
                      message canonique (EXPERIENCE.md), même illustration. */}
                  <EmptyState
                    icon={Sofa}
                    message="Pas cours demain, profite de ta soirée !"
                    layout="inline"
                  />
                </div>
              )}
            </div>
          </MomentSoirCard>
        }
      />

      <AddHomeworkFab subjects={homeworkSubjects} scheduleSlots={slots} />
    </div>
  );
}
