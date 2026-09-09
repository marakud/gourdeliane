import { describe, expect, it } from "vitest";
import {
  CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
  CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
  CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
  CHECKLIST_TYPE_MATIN,
  CHECKLIST_TYPE_RETOUR,
  DEFAULT_RETOUR_ITEMS,
  deriveFixedChecklist,
  deriveSacChecklist,
  partitionDevoirsARendreForSac,
  type ChecklistItemStateInput,
  type ChecklistSubjectGroupInput,
  type DevoirARendreInput,
  type FixedChecklistItemInput,
} from "./checklist";

const MATHS = { id: "subject-maths", name: "Maths", colorIndex: 1 };
const EPS = { id: "subject-eps", name: "EPS", colorIndex: 2 };

describe("deriveSacChecklist (spec 2.1 I/O matrix)", () => {
  it("groups items by subject, unchecked by default when no state exists", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      {
        subject: MATHS,
        items: [
          { id: "item-cahier", label: "Cahier de maths" },
          { id: "item-calc", label: "Calculatrice" },
        ],
      },
    ];

    const result = deriveSacChecklist(groups, []);

    expect(result).toEqual([
      {
        subject: MATHS,
        items: [
          {
            sourceId: "item-cahier",
            sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
            label: "Cahier de maths",
            checked: false,
          },
          {
            sourceId: "item-calc",
            sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
            label: "Calculatrice",
            checked: false,
          },
        ],
      },
    ]);
  });

  it("keeps a subject with no SubjectItem defined, without error, items empty", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      { subject: EPS, items: [] },
    ];

    const result = deriveSacChecklist(groups, []);

    expect(result).toEqual([{ subject: EPS, items: [] }]);
  });

  it("returns an empty list when there are no subjects (caller shows the neutral message)", () => {
    expect(deriveSacChecklist([], [])).toEqual([]);
  });

  it("reflects an existing checked state keyed by sourceId", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      { subject: MATHS, items: [{ id: "item-cahier", label: "Cahier de maths" }] },
    ];
    const states: ChecklistItemStateInput[] = [
      {
        sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
        sourceId: "item-cahier",
        checked: true,
      },
    ];

    const result = deriveSacChecklist(groups, states);

    expect(result[0].items[0].checked).toBe(true);
  });

  it("keeps the checked state after the SubjectItem label changes (same id -- AD-3, FR-5)", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      { subject: MATHS, items: [{ id: "item-cahier", label: "Nouveau libellé" }] },
    ];
    const states: ChecklistItemStateInput[] = [
      {
        sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
        sourceId: "item-cahier",
        checked: true,
      },
    ];

    const result = deriveSacChecklist(groups, states);

    expect(result[0].items[0]).toEqual({
      sourceId: "item-cahier",
      sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
      label: "Nouveau libellé",
      checked: true,
    });
  });

  it("shows a newly added item unchecked while an existing item keeps its checked state", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      {
        subject: MATHS,
        items: [
          { id: "item-cahier", label: "Cahier de maths" },
          { id: "item-nouveau", label: "Trousse" },
        ],
      },
    ];
    const states: ChecklistItemStateInput[] = [
      {
        sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
        sourceId: "item-cahier",
        checked: true,
      },
    ];

    const result = deriveSacChecklist(groups, states);

    expect(result[0].items).toEqual([
      {
        sourceId: "item-cahier",
        sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
        label: "Cahier de maths",
        checked: true,
      },
      {
        sourceId: "item-nouveau",
        sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
        label: "Trousse",
        checked: false,
      },
    ]);
  });

  it("drops a deleted SubjectItem from the output without error, its orphaned state simply unused", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      { subject: MATHS, items: [{ id: "item-still-here", label: "Cahier" }] },
    ];
    const states: ChecklistItemStateInput[] = [
      {
        sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
        sourceId: "item-deleted",
        checked: true,
      },
    ];

    const result = deriveSacChecklist(groups, states);

    expect(result[0].items).toEqual([
      {
        sourceId: "item-still-here",
        sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
        label: "Cahier",
        checked: false,
      },
    ]);
  });

  it("ignores checked states of a different sourceType", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      { subject: MATHS, items: [{ id: "item-cahier", label: "Cahier" }] },
    ];
    const states: ChecklistItemStateInput[] = [
      { sourceType: "FIXED_ITEM", sourceId: "item-cahier", checked: true },
    ];

    const result = deriveSacChecklist(groups, states);

    expect(result[0].items[0].checked).toBe(false);
  });

  describe("devoir « à rendre » injecté dans le groupe (Story 2.5, FR-18)", () => {
    it("mixes a SubjectItem and a devoir à rendre in the same group, each carrying its own sourceType", () => {
      const groups: ChecklistSubjectGroupInput[] = [
        {
          subject: MATHS,
          items: [
            { id: "item-cahier", label: "Cahier de maths" },
            {
              id: "devoir-1",
              label: "Exercices p.42 à rendre",
              sourceType: CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
            },
          ],
        },
      ];

      const result = deriveSacChecklist(groups, []);

      expect(result[0].items).toEqual([
        {
          sourceId: "item-cahier",
          sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
          label: "Cahier de maths",
          checked: false,
        },
        {
          sourceId: "devoir-1",
          sourceType: CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
          label: "Exercices p.42 à rendre",
          checked: false,
        },
      ]);
    });

    it("checks a devoir à rendre independently from a SubjectItem checked state, even with the same id", () => {
      // Cas limite volontaire (aucun risque réel avec des cuid(), la clé
      // composite le garantit explicitement plutôt que par convention).
      const groups: ChecklistSubjectGroupInput[] = [
        {
          subject: MATHS,
          items: [
            { id: "same-id", label: "Cahier de maths" },
            {
              id: "same-id",
              label: "Exercices p.42 à rendre",
              sourceType: CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
            },
          ],
        },
      ];
      const states: ChecklistItemStateInput[] = [
        {
          sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
          sourceId: "same-id",
          checked: true,
        },
      ];

      const result = deriveSacChecklist(groups, states);

      expect(result[0].items[0].checked).toBe(true); // SubjectItem
      expect(result[0].items[1].checked).toBe(false); // devoir à rendre, non affecté
    });

    it("reflects a checked state for a devoir à rendre without affecting Devoir.done (état séparé, AD-7)", () => {
      const groups: ChecklistSubjectGroupInput[] = [
        {
          subject: MATHS,
          items: [
            {
              id: "devoir-2",
              label: "Feuille de SVT à rendre",
              sourceType: CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
            },
          ],
        },
      ];
      const states: ChecklistItemStateInput[] = [
        {
          sourceType: CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
          sourceId: "devoir-2",
          checked: true,
        },
      ];

      const result = deriveSacChecklist(groups, states);

      expect(result[0].items[0].checked).toBe(true);
      expect(result[0].items[0].sourceType).toBe(CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE);
    });
  });
});

describe("partitionDevoirsARendreForSac (Story 2.5, FR-18)", () => {
  function devoir(overrides: Partial<DevoirARendreInput>): DevoirARendreInput {
    return {
      id: "devoir-1",
      subjectId: MATHS.id,
      description: "Exercices p.42",
      aRendre: true,
      echeanceIso: "2026-09-10",
      ...overrides,
    };
  }

  const TOMORROW = "2026-09-10";
  const SUBJECTS_WITH_SAC_GROUP = new Set([MATHS.id]);

  it("injects a devoir à rendre due tomorrow into its subject's item list and marks it consumed", () => {
    const result = partitionDevoirsARendreForSac(
      [devoir({})],
      TOMORROW,
      SUBJECTS_WITH_SAC_GROUP
    );

    expect(result.itemsBySubjectId.get(MATHS.id)).toEqual([
      {
        id: "devoir-1",
        label: "Exercices p.42 à rendre",
        sourceType: CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
      },
    ]);
    expect(result.consumedIds.has("devoir-1")).toBe(true);
  });

  it("does not inject a devoir à rendre whose subject has no Sac group (no class tomorrow) -- not consumed either", () => {
    const result = partitionDevoirsARendreForSac(
      [devoir({ subjectId: EPS.id })],
      TOMORROW,
      SUBJECTS_WITH_SAC_GROUP // EPS absent
    );

    expect(result.itemsBySubjectId.has(EPS.id)).toBe(false);
    expect(result.consumedIds.size).toBe(0);
  });

  it("ignores a devoir not marked à rendre even if due tomorrow", () => {
    const result = partitionDevoirsARendreForSac(
      [devoir({ aRendre: false })],
      TOMORROW,
      SUBJECTS_WITH_SAC_GROUP
    );

    expect(result.itemsBySubjectId.size).toBe(0);
    expect(result.consumedIds.size).toBe(0);
  });

  it("ignores a devoir à rendre with no échéance", () => {
    const result = partitionDevoirsARendreForSac(
      [devoir({ echeanceIso: null })],
      TOMORROW,
      SUBJECTS_WITH_SAC_GROUP
    );

    expect(result.itemsBySubjectId.size).toBe(0);
  });

  it("ignores a devoir à rendre whose échéance isn't precisely tomorrow", () => {
    const result = partitionDevoirsARendreForSac(
      [devoir({ echeanceIso: "2026-09-20" })],
      TOMORROW,
      SUBJECTS_WITH_SAC_GROUP
    );

    expect(result.itemsBySubjectId.size).toBe(0);
  });

  it("accumulates multiple devoirs à rendre for the same subject", () => {
    const result = partitionDevoirsARendreForSac(
      [
        devoir({ id: "devoir-1", description: "Exercices p.42" }),
        devoir({ id: "devoir-2", description: "Feuille de géométrie" }),
      ],
      TOMORROW,
      SUBJECTS_WITH_SAC_GROUP
    );

    expect(result.itemsBySubjectId.get(MATHS.id)?.map((item) => item.id)).toEqual([
      "devoir-1",
      "devoir-2",
    ]);
    expect(result.consumedIds).toEqual(new Set(["devoir-1", "devoir-2"]));
  });

  it('suffixes the label with "à rendre"', () => {
    const result = partitionDevoirsARendreForSac(
      [devoir({ description: "Exercices p.42" })],
      TOMORROW,
      SUBJECTS_WITH_SAC_GROUP
    );

    expect(result.itemsBySubjectId.get(MATHS.id)?.[0].label).toBe(
      "Exercices p.42 à rendre"
    );
  });

  it('does not duplicate the suffix when the description already mentions "à rendre"', () => {
    const result = partitionDevoirsARendreForSac(
      [devoir({ description: "Dossier à rendre" })],
      TOMORROW,
      SUBJECTS_WITH_SAC_GROUP
    );

    expect(result.itemsBySubjectId.get(MATHS.id)?.[0].label).toBe(
      "Dossier à rendre"
    );
  });
});

describe("deriveFixedChecklist (spec 2.2 I/O matrix)", () => {
  it("returns a flat list, unchecked by default when no state exists (première consultation)", () => {
    const items: FixedChecklistItemInput[] = [
      { id: "item-cles", label: "Clés" },
      { id: "item-gouter", label: "Goûter" },
      { id: "item-carnet", label: "Carnet" },
      { id: "item-chargeur", label: "Chargeur" },
    ];

    const result = deriveFixedChecklist(items, []);

    expect(result).toEqual([
      {
        sourceId: "item-cles",
        sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
        label: "Clés",
        checked: false,
      },
      {
        sourceId: "item-gouter",
        sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
        label: "Goûter",
        checked: false,
      },
      {
        sourceId: "item-carnet",
        sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
        label: "Carnet",
        checked: false,
      },
      {
        sourceId: "item-chargeur",
        sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
        label: "Chargeur",
        checked: false,
      },
    ]);
  });

  it("returns an empty list when the user deleted everything (pas de recréation des défauts)", () => {
    expect(deriveFixedChecklist([], [])).toEqual([]);
  });

  it("reflects an existing checked state keyed by sourceId (item coché)", () => {
    const items: FixedChecklistItemInput[] = [{ id: "item-cles", label: "Clés" }];
    const states: ChecklistItemStateInput[] = [
      { sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM, sourceId: "item-cles", checked: true },
    ];

    const result = deriveFixedChecklist(items, states);

    expect(result[0].checked).toBe(true);
  });

  it("keeps the checked state after the label changes (même id, AD-3)", () => {
    const items: FixedChecklistItemInput[] = [
      { id: "item-cles", label: "Trousseau de clés" },
    ];
    const states: ChecklistItemStateInput[] = [
      { sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM, sourceId: "item-cles", checked: true },
    ];

    const result = deriveFixedChecklist(items, states);

    expect(result[0]).toEqual({
      sourceId: "item-cles",
      sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
      label: "Trousseau de clés",
      checked: true,
    });
  });

  it("shows all items unchecked on a new school day (états d'une autre date, jamais transmis ici)", () => {
    const items: FixedChecklistItemInput[] = [
      { id: "item-cles", label: "Clés" },
      { id: "item-gouter", label: "Goûter" },
    ];

    // La date fait déjà partie de la clé (data/checklist.ts) : un nouveau
    // jour scolaire signifie que l'appelant charge `checkedStates: []` pour
    // cette nouvelle date, jamais les états d'hier.
    const result = deriveFixedChecklist(items, []);

    expect(result.every((item) => item.checked === false)).toBe(true);
  });

  it("drops a deleted FixedChecklistItem from the output without error, its orphaned state simply unused", () => {
    const items: FixedChecklistItemInput[] = [{ id: "item-still-here", label: "Carnet" }];
    const states: ChecklistItemStateInput[] = [
      { sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM, sourceId: "item-deleted", checked: true },
    ];

    const result = deriveFixedChecklist(items, states);

    expect(result).toEqual([
      {
        sourceId: "item-still-here",
        sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
        label: "Carnet",
        checked: false,
      },
    ]);
  });

  it("ignores checked states of a different sourceType (ex. un état du sac)", () => {
    const items: FixedChecklistItemInput[] = [{ id: "item-cles", label: "Clés" }];
    const states: ChecklistItemStateInput[] = [
      { sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM, sourceId: "item-cles", checked: true },
    ];

    const result = deriveFixedChecklist(items, states);

    expect(result[0].checked).toBe(false);
  });
});

describe("deriveFixedChecklist -- Retour (spec 2.3 I/O matrix, mêmes cas que Matin)", () => {
  it("has its own checklistType and default labels, distinct from Matin", () => {
    expect(CHECKLIST_TYPE_RETOUR).toBe("RETOUR");
    expect(CHECKLIST_TYPE_RETOUR).not.toBe(CHECKLIST_TYPE_MATIN);
    expect(DEFAULT_RETOUR_ITEMS).toEqual([
      "Sortir le carnet/mot",
      "Ranger le sac",
      "Devoirs faits",
    ]);
  });

  it("returns the default Retour list unchecked (première consultation)", () => {
    const items: FixedChecklistItemInput[] = DEFAULT_RETOUR_ITEMS.map(
      (label, index) => ({ id: `item-retour-${index}`, label })
    );

    const result = deriveFixedChecklist(items, []);

    expect(result).toEqual(
      DEFAULT_RETOUR_ITEMS.map((label, index) => ({
        sourceId: `item-retour-${index}`,
        sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
        label,
        checked: false,
      }))
    );
  });

  it("reflects an existing checked state keyed by sourceId, same mechanism as Matin", () => {
    const items: FixedChecklistItemInput[] = [
      { id: "item-carnet", label: "Sortir le carnet/mot" },
    ];
    const states: ChecklistItemStateInput[] = [
      {
        sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
        sourceId: "item-carnet",
        checked: true,
      },
    ];

    const result = deriveFixedChecklist(items, states);

    expect(result[0].checked).toBe(true);
  });

  it("shows all items unchecked on a new school day (états d'une autre date, jamais transmis ici)", () => {
    const items: FixedChecklistItemInput[] = [
      { id: "item-carnet", label: "Sortir le carnet/mot" },
      { id: "item-sac", label: "Ranger le sac" },
    ];

    const result = deriveFixedChecklist(items, []);

    expect(result.every((item) => item.checked === false)).toBe(true);
  });
});
