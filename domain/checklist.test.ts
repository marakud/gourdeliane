import { describe, expect, it } from "vitest";
import {
  CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
  CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
  deriveFixedChecklist,
  deriveSacChecklist,
  type ChecklistItemStateInput,
  type ChecklistSubjectGroupInput,
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
          { sourceId: "item-cahier", label: "Cahier de maths", checked: false },
          { sourceId: "item-calc", label: "Calculatrice", checked: false },
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
      { sourceId: "item-cahier", label: "Cahier de maths", checked: true },
      { sourceId: "item-nouveau", label: "Trousse", checked: false },
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
      { sourceId: "item-still-here", label: "Cahier", checked: false },
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
      { sourceId: "item-cles", label: "Clés", checked: false },
      { sourceId: "item-gouter", label: "Goûter", checked: false },
      { sourceId: "item-carnet", label: "Carnet", checked: false },
      { sourceId: "item-chargeur", label: "Chargeur", checked: false },
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
      { sourceId: "item-still-here", label: "Carnet", checked: false },
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
